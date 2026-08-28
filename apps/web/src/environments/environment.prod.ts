export const environment = {
  production: true,
  apiUrl: 'https://portalcoraza.onrender.com/api/v1',
  supabase: {
    url: 'https://duxpqkldgdnfcabpkogl.supabase.co',
    publishableKey:
      'sb_publishable_20qs6z_FtzADizozxaMINA_Erydooyv',
  },
  /** Módulos oficiales fuera del monorepo; el portal solo autentica y redirige. */
  externalApps: {
    gestionHumana: 'https://gestion-humana-2qop.onrender.com',
    programacion: 'https://freidercao-spec.github.io/APP-CONTABILIDAD/',
  },
  minutaWebUrl: 'https://portalcoraza-minuta.onrender.com',
};
