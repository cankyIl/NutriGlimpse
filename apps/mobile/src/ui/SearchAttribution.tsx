export function SearchAttribution({html}:{html:string|null}){
 if(!html)return null;
 return <iframe title="Google Search suggestions" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={'<meta name="referrer" content="no-referrer">'+html} style={{border:0,width:'100%',height:150}}/>;
}
