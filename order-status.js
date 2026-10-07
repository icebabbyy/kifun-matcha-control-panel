export const orderStates={awaiting:'รอร้านรับออเดอร์',accepted:'ร้านรับออเดอร์แล้ว · กำลังเตรียม',ready:'เครื่องดื่มพร้อมแล้ว · ชำระเงินตอนรับ',completed:'ส่งมอบและรับเงินเรียบร้อยแล้ว',declined:'ร้านไม่สามารถรับออเดอร์นี้ได้ · ยังไม่มีการชำระเงิน'};
export function orderButtons(id,state){
 const button=(text,action)=>({text,callback_data:`order:${action}:${id}`});
 return {inline_keyboard:state==='awaiting'?[[button('✅ รับออเดอร์','accept'),button('❌ ไม่รับออเดอร์','decline')]]:state==='accepted'?[[button('🍵 พร้อมส่งมอบ','ready')]]:state==='ready'?[[button('✅ ส่งมอบและได้รับเงินแล้ว','complete')]]:[]};
}
