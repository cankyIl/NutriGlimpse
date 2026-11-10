/** Response journals are a beta-only feature, never enabled by a production flag alone. */
export function betaDiagnosticsEnabled(environment:Record<string,string|undefined>){
 return environment.GROCERY_BUILD_STAGE==='beta0'&&environment.GROCERY_BETA_DIAGNOSTICS==='true';
}
