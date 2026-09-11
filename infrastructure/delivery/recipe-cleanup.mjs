export async function cleanupRecipeData(deleteArticle, deleteUpload) {
  try {
    await deleteArticle();
  } finally {
    await deleteUpload();
  }
}
