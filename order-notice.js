const notices={
 awaiting:['ส่งออเดอร์แล้ว 🍵','รอร้านยืนยันออเดอร์สักครู่ ยังไม่ต้องชำระเงินนะ'],
 accepted:['ร้านรับออเดอร์แล้ว 🍵','กำลังเตรียมมัทฉะให้คุณ ชำระเงินตอนร้านนำเครื่องดื่มมาเสิร์ฟได้เลย'],
 ready:['มัทฉะพร้อมแล้ว 🍵','ร้านกำลังนำเครื่องดื่มมาเสิร์ฟ ชำระเงินตอนรับเครื่องดื่มได้เลย'],
 declined:['ร้านไม่สามารถรับออเดอร์นี้ได้','ยังไม่มีการชำระเงิน กรุณาสอบถามร้านได้เลย']
};
export function showOrderNotice(order){
 const notice=notices[order.fulfillment];
 if(!notice||document.querySelector('#store-dialog')?.open)return;
 const key=`happihaus-notice:${order.requestId}:${order.fulfillment}`;
 if(sessionStorage.getItem(key))return;
 let dialog=document.querySelector('#order-status-dialog');
 if(!dialog){
  dialog=document.createElement('dialog');dialog.id='order-status-dialog';
  dialog.setAttribute('aria-labelledby','order-notice-title');
  dialog.innerHTML='<div class="order-notice-icon">🍵</div><h2 id="order-notice-title"></h2><p class="order-notice-number"></p><p class="order-notice-message"></p><button type="button" class="store-primary">รับทราบ</button>';
  dialog.querySelector('button').addEventListener('click',()=>dialog.close());
  document.body.append(dialog);
 }
 dialog.querySelector('h2').textContent=notice[0];
 dialog.querySelector('.order-notice-number').textContent=order.orderNumber;
 dialog.querySelector('.order-notice-message').textContent=notice[1];
 if(!dialog.open)dialog.showModal();
 sessionStorage.setItem(key,'shown');
}
