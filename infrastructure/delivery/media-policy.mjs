export function recipeMediaUrl(value, environment) {
  const staging = environment === 'staging';
  if (!staging && environment !== 'production') throw new Error('A named environment is required');
  const cms = staging ? 'https://staging-cms.gthf.fr' : 'https://cms.gthf.fr';
  const allowed = staging ? ['https://gthf-staging-media-bis.s3.gra.io.cloud.ovh.net', cms] : ['https://gthdf-staging-media.s3.eu-west-par.io.cloud.ovh.net', cms, 'https://cellar-c2.services.clever-cloud.com'];
  const url = new URL(value, cms);
  if (!allowed.includes(url.origin) || url.username || url.password) throw new Error('Unexpected recipe media origin');
  return url;
}
