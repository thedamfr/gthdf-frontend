#!/usr/bin/env python3
"""Export the structured contents of the GTHF XLSX inventory as UTF-8 CSV.

This intentionally uses only Python's standard library. It reads cached cell
values directly from the Office Open XML archive; it does not evaluate Excel
formulas.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import posixpath
import re
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path
from xml.etree import ElementTree as ET


BASE_DIR = Path(__file__).resolve().parent
SOURCE_FILENAME = "GTHF_villes_et_produits_SEO.xlsx"
DEFAULT_SOURCE = BASE_DIR / "source" / SOURCE_FILENAME
CSV_DIR = BASE_DIR / "csv"
MANIFEST_PATH = BASE_DIR / "manifest.json"

SHEET_FILENAMES = {
    "Synthèse": "synthese.csv",
    "Villes": "villes.csv",
    "Produits": "produits.csv",
    "QA seuils": "qa_seuils.csv",
    "Chapitres": "chapitres.csv",
    "Méthode": "methode.csv",
}

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
OFFICE_REL_NS = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
)
NS = {"m": MAIN_NS, "r": OFFICE_REL_NS}
CELL_REFERENCE = re.compile(r"^\$?([A-Z]+)\$?(\d+)$")
RANGE_REFERENCE = re.compile(
    r"^\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$"
)


@dataclass(frozen=True)
class TableDefinition:
    name: str
    reference: str
    headers: list[str]


@dataclass(frozen=True)
class Worksheet:
    name: str
    path: str


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def archive_path(base_path: str, target: str) -> str:
    """Resolve an OOXML relationship target to a normalized archive path."""

    if target.startswith("/"):
        return target.lstrip("/")
    return posixpath.normpath(posixpath.join(posixpath.dirname(base_path), target))


def column_index(letters: str) -> int:
    result = 0
    for character in letters:
        result = result * 26 + ord(character) - ord("A") + 1
    return result


def parse_cell_reference(reference: str) -> tuple[int, int]:
    match = CELL_REFERENCE.match(reference)
    if not match:
        raise ValueError(f"Invalid cell reference: {reference}")
    return int(match.group(2)), column_index(match.group(1))


def parse_range(reference: str) -> tuple[int, int, int, int]:
    match = RANGE_REFERENCE.match(reference)
    if not match:
        raise ValueError(f"Invalid range reference: {reference}")
    return (
        int(match.group(2)),
        column_index(match.group(1)),
        int(match.group(4)),
        column_index(match.group(3)),
    )


def read_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    path = "xl/sharedStrings.xml"
    if path not in archive.namelist():
        return []

    root = ET.fromstring(archive.read(path))
    return [
        "".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t"))
        for item in root.findall("m:si", NS)
    ]


def read_worksheets(archive: zipfile.ZipFile) -> list[Worksheet]:
    workbook_path = "xl/workbook.xml"
    relationships_path = "xl/_rels/workbook.xml.rels"
    workbook = ET.fromstring(archive.read(workbook_path))
    relationships = ET.fromstring(archive.read(relationships_path))
    targets = {
        relationship.attrib["Id"]: archive_path(
            workbook_path, relationship.attrib["Target"]
        )
        for relationship in relationships
    }

    sheets = workbook.find("m:sheets", NS)
    if sheets is None:
        raise ValueError("The workbook has no worksheets")

    return [
        Worksheet(
            name=sheet.attrib["name"],
            path=targets[sheet.attrib[f"{{{OFFICE_REL_NS}}}id"]],
        )
        for sheet in sheets
    ]


def read_table_definitions(
    archive: zipfile.ZipFile, worksheet_path: str
) -> list[TableDefinition]:
    relationships_path = posixpath.join(
        posixpath.dirname(worksheet_path),
        "_rels",
        f"{posixpath.basename(worksheet_path)}.rels",
    )
    if relationships_path not in archive.namelist():
        return []

    relationships = ET.fromstring(archive.read(relationships_path))
    table_paths = [
        archive_path(worksheet_path, relationship.attrib["Target"])
        for relationship in relationships
        if relationship.attrib.get("Type", "").endswith("/table")
    ]

    result: list[TableDefinition] = []
    for table_path in table_paths:
        table = ET.fromstring(archive.read(table_path))
        result.append(
            TableDefinition(
                name=table.attrib["name"],
                reference=table.attrib["ref"],
                headers=[
                    column.attrib["name"]
                    for column in table.findall(".//m:tableColumn", NS)
                ],
            )
        )
    return result


def cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(
            node.text or "" for node in cell.iter(f"{{{MAIN_NS}}}t")
        )

    value = cell.find("m:v", NS)
    if value is None or value.text is None:
        return ""
    if cell_type == "s":
        return shared_strings[int(value.text)]
    if cell_type == "b":
        return "true" if value.text == "1" else "false"
    return value.text


def read_cells(
    archive: zipfile.ZipFile,
    worksheet_path: str,
    shared_strings: list[str],
) -> tuple[dict[tuple[int, int], str], int, int]:
    root = ET.fromstring(archive.read(worksheet_path))
    values: dict[tuple[int, int], str] = {}
    formula_cells = 0
    formulas_without_cache = 0

    for cell in root.findall(".//m:sheetData/m:row/m:c", NS):
        reference = cell.attrib.get("r")
        if not reference:
            raise ValueError(f"Cell without a reference in {worksheet_path}")
        coordinates = parse_cell_reference(reference)
        value = cell_value(cell, shared_strings)
        if value:
            values[coordinates] = value

        if cell.find("m:f", NS) is not None:
            formula_cells += 1
            cached_value = cell.find("m:v", NS)
            if cached_value is None or cached_value.text is None:
                formulas_without_cache += 1

    return values, formula_cells, formulas_without_cache


def render_table(
    cells: dict[tuple[int, int], str], table: TableDefinition
) -> list[list[str]]:
    first_row, first_column, last_row, last_column = parse_range(table.reference)
    expected_columns = last_column - first_column + 1
    if len(table.headers) != expected_columns:
        raise ValueError(
            f"Table {table.name} declares {len(table.headers)} columns for "
            f"range {table.reference}"
        )

    worksheet_headers = [
        cells.get((first_row, column), "")
        for column in range(first_column, last_column + 1)
    ]
    if worksheet_headers != table.headers:
        raise ValueError(
            f"Table headers differ from worksheet values for {table.name}"
        )

    rows = [table.headers]
    rows.extend(
        [
            cells.get((row, column), "")
            for column in range(first_column, last_column + 1)
        ]
        for row in range(first_row + 1, last_row + 1)
    )
    return rows


def render_used_range(cells: dict[tuple[int, int], str]) -> list[list[str]]:
    if not cells:
        return []
    last_row = max(row for row, _ in cells)
    last_column = max(column for _, column in cells)
    return [
        [cells.get((row, column), "") for column in range(1, last_column + 1)]
        for row in range(1, last_row + 1)
    ]


def csv_bytes(rows: list[list[str]]) -> bytes:
    output = io.StringIO(newline="")
    writer = csv.writer(
        output,
        delimiter=",",
        quotechar='"',
        quoting=csv.QUOTE_MINIMAL,
        lineterminator="\n",
    )
    writer.writerows(rows)
    return output.getvalue().encode("utf-8")


def build_exports(source_path: Path) -> tuple[dict[str, bytes], bytes]:
    source_content = source_path.read_bytes()
    exports: dict[str, bytes] = {}
    sheet_manifest: list[dict[str, object]] = []

    with zipfile.ZipFile(io.BytesIO(source_content)) as archive:
        shared_strings = read_shared_strings(archive)
        worksheets = read_worksheets(archive)

        actual_sheet_names = [worksheet.name for worksheet in worksheets]
        if actual_sheet_names != list(SHEET_FILENAMES):
            raise ValueError(
                "Unexpected sheet order or names: " + ", ".join(actual_sheet_names)
            )

        for worksheet in worksheets:
            cells, formula_cells, formulas_without_cache = read_cells(
                archive, worksheet.path, shared_strings
            )
            tables = read_table_definitions(archive, worksheet.path)
            if len(tables) > 1:
                raise ValueError(
                    f"Multiple tables are not supported in sheet {worksheet.name}"
                )

            if tables:
                table = tables[0]
                rows = render_table(cells, table)
                export_kind = "excel_table"
                source_range = table.reference
                table_name: str | None = table.name
                headers: list[str] | None = table.headers
                record_count: int | None = len(rows) - 1
            else:
                rows = render_used_range(cells)
                export_kind = "used_range"
                source_range = None
                table_name = None
                headers = None
                record_count = None

            filename = SHEET_FILENAMES[worksheet.name]
            content = csv_bytes(rows)
            exports[filename] = content
            sheet_manifest.append(
                {
                    "sheet": worksheet.name,
                    "csv": f"csv/{filename}",
                    "exportKind": export_kind,
                    "tableName": table_name,
                    "sourceRange": source_range,
                    "csvRows": len(rows),
                    "records": record_count,
                    "columns": max((len(row) for row in rows), default=0),
                    "headers": headers,
                    "formulaCells": formula_cells,
                    "formulasWithoutCachedValue": formulas_without_cache,
                    "bytes": len(content),
                    "sha256": sha256_bytes(content),
                }
            )

    records_by_sheet = {
        entry["sheet"]: entry["records"]
        for entry in sheet_manifest
        if entry["records"] is not None
    }
    manifest = {
        "schemaVersion": 1,
        "dataset": "GTHF_villes_et_produits_SEO",
        "brand": "GTHF",
        "source": {
            "file": f"source/{SOURCE_FILENAME}",
            "bytes": len(source_content),
            "sha256": sha256_bytes(source_content),
        },
        "csvDialect": {
            "encoding": "UTF-8",
            "delimiter": ",",
            "quote": '"',
            "lineEnding": "LF",
            "booleanValues": ["true", "false"],
            "formulaPolicy": "cached-values-only",
        },
        "inventory": {
            "cities": records_by_sheet.get("Villes"),
            "products": records_by_sheet.get("Produits"),
            "thresholdQaRows": records_by_sheet.get("QA seuils"),
            "chapters": records_by_sheet.get("Chapitres"),
            "methodRules": records_by_sheet.get("Méthode"),
        },
        "sheets": sheet_manifest,
    }
    manifest_content = (
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    ).encode("utf-8")
    return exports, manifest_content


def check_outputs(exports: dict[str, bytes], manifest_content: bytes) -> None:
    failures: list[str] = []
    expected_names = set(exports)
    actual_names = {path.name for path in CSV_DIR.glob("*.csv")}

    for filename, expected in exports.items():
        path = CSV_DIR / filename
        if not path.is_file():
            failures.append(f"missing: {path.relative_to(BASE_DIR)}")
        elif path.read_bytes() != expected:
            failures.append(f"different: {path.relative_to(BASE_DIR)}")

    for filename in sorted(actual_names - expected_names):
        failures.append(f"unexpected: csv/{filename}")

    if not MANIFEST_PATH.is_file():
        failures.append("missing: manifest.json")
    elif MANIFEST_PATH.read_bytes() != manifest_content:
        failures.append("different: manifest.json")

    if failures:
        for failure in failures:
            print(failure, file=sys.stderr)
        raise SystemExit(1)


def write_outputs(exports: dict[str, bytes], manifest_content: bytes) -> None:
    CSV_DIR.mkdir(parents=True, exist_ok=True)
    for filename, content in exports.items():
        (CSV_DIR / filename).write_bytes(content)
    MANIFEST_PATH.write_bytes(manifest_content)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help=f"XLSX source (default: {DEFAULT_SOURCE})",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify committed CSV and manifest files without rewriting them",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    exports, manifest_content = build_exports(args.source)
    if args.check:
        check_outputs(exports, manifest_content)
        action = "verified"
    else:
        write_outputs(exports, manifest_content)
        action = "exported"

    manifest = json.loads(manifest_content)
    inventory = manifest["inventory"]
    print(
        f"{action}: {len(exports)} CSV; "
        f"{inventory['cities']} cities; {inventory['products']} products"
    )


if __name__ == "__main__":
    main()
