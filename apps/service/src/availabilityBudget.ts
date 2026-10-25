import {DatabaseSync} from 'node:sqlite';
/** Counts only: no product, query, IP, coordinates, or user identifiers. */
export function availabilityBudget(path:string,now=()=>Date.now(),hourLimit=45,monthLimit:number|null=200){
 const db=new DatabaseSync(path);
 db.exec('CREATE TABLE IF NOT EXISTS reservations (hour TEXT PRIMARY KEY, count INTEGER NOT NULL)');
 const get=db.prepare('SELECT COALESCE(SUM(count),0) AS n FROM reservations WHERE hour LIKE ?');
 const add=db.prepare('INSERT INTO reservations VALUES (?,1) ON CONFLICT(hour) DO UPDATE SET count=count+1');
 return {
  reserve(){
   const hour=new Date(now()).toISOString().slice(0,13),month=hour.slice(0,7);
   db.exec('BEGIN IMMEDIATE');
   try{
    const hourly=Number(get.get(hour)?.n??0),monthly=Number(get.get(month+'%')?.n??0);
    if(hourly>=hourLimit||(monthLimit!==null&&monthly>=monthLimit)){db.exec('ROLLBACK');return false;}
    add.run(hour);db.prepare('DELETE FROM reservations WHERE hour < ?').run(month);
    db.exec('COMMIT');return true;
   }catch{db.exec('ROLLBACK');return false;}
  },
  close(){db.close();},
 };
}
