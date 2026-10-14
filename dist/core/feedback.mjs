// Presentation derives from the single session clock and actual order state.
export function clockFeedback(snapshot) {
  const {time,startTime,deadline,observedTime,done,paused,pauseReason,marketDataKind}=snapshot;
  const remaining=Math.max(0,deadline-time),seconds=Math.ceil(remaining/1000);
  const age=Math.max(0,(time-observedTime)/1000),kind=marketDataKind==='quote'?'quote':'trade';
  return {
    progress:deadline===startTime?1:Math.max(0,Math.min(1,(time-startTime)/(deadline-startTime))),
    remaining,age,
    countdown:done?'Settled':String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')+' left',
    urgency:done?'settled':remaining<=60000?'urgent':remaining<=300000?'soon':'normal',
    state:done?'Chapter ended':paused?pauseReason:age>=2?'Waiting for next '+kind:'Replaying historical '+kind+'s',
    freshness:'Last '+kind+' '+new Date(observedTime).toISOString().slice(11,23)+' UTC · '+age.toFixed(1)+' historical s ago'
  };
}

export function orderFeedback(order,rules) {
  const qty=n=>(n/rules.quantityScale).toFixed(Math.ceil(Math.log10(rules.quantityScale)))+' '+rules.baseAsset;
  const filled=order.filledUnits||0,remaining=order.units-filled;
  const label={pending:order.type==='stop'&&!order.triggered?'Waiting for stop trigger':'Queued',partial:'Partially filled',filled:'Filled',cancelled:'Cancelled',rejected:'Rejected',expired:'Expired'}[order.status]||order.status;
  const active=['pending','partial'].includes(order.status);
  return '#'+order.id+' '+order.side.toUpperCase()+' — '+label+'. '+qty(filled)+' filled; '+qty(remaining)+(active?' remaining.':' unfilled.')+(order.reason?' '+order.reason+'.':'')+(order.triggered&&active?' Stop triggered; remainder stays active.':'');
}
