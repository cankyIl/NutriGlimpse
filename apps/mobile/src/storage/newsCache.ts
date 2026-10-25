let value:string|null=null;
export const newsCache={get:async()=>value,set:async(next:string)=>{value=next;}};
