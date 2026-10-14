export function validateChapter(chapter,rows){
 const reference=chapter.rules?.marketDataKind==='reference';
 if(reference&&(!/^\d{4}-\d{2}-\d{2}$/.test(chapter.endDate||'')||chapter.date>chapter.endDate||!rows.length))throw Error('Reference chapter requires a bounded date interval');
 if(rows.length!==chapter.rows||rows.some((r,i)=>!Number.isSafeInteger(r[0])||!Number.isSafeInteger(r[1])||r[1]<=0||
  (reference?(r[0]%86400000!==0||r[4]!==new Date(r[0]).toISOString().slice(0,10)||r[4]<chapter.date||r[4]>chapter.endDate):new Date(r[0]).toISOString().slice(0,10)!==chapter.date)||
  (i&&(r[0]<rows[i-1][0]||(reference&&r[0]===rows[i-1][0])||(chapter.rules?.marketDataKind==='quote'?r[2]<=rows[i-1][2]:r[2]!==rows[i-1][2]+1)))))throw Error('Historical chapter failed validation');
 if(reference&&(rows[0][4]!==chapter.date||rows.at(-1)[4]!==chapter.endDate))throw Error('Reference interval differs from chapter dates');
}
