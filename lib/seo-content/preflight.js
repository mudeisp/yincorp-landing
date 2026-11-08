// Preflight never receives a paid provider transport. Reject before network dispatch.
export function readOnlyPreflightFetch(fetcher=fetch){
  return (input,options={})=>{
    const method=(options.method||(input instanceof Request?input.method:'GET')).toUpperCase();
    if(method!=='GET')throw Error('preflight_remote_write_forbidden');
    return fetcher(input,options);
  };
}
