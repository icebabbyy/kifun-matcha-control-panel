"""Merge the 184 archived supplier rows with the September intake; retain provenance."""
from pathlib import Path
import json, re, unicodedata
P=Path(__file__).parent
d=json.loads((P/'buying-data.json').read_text(encoding='utf8'))
new=[r for r in d['rows'] if r.get('source')!='legacy']
old=json.loads((P/'supplier-legacy.json').read_text(encoding='utf8'))
def norm(s):
 return re.sub(r'[^a-z0-9ก-๙]+','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
aliases={'yamesancho':'sancho','yamesanji':'sanji','everydaynuttypremium':'everydaynuttypremiumgrade','isecafe':'isecafe'}
def key(v,n):
 n=norm(n)
 if v=='Midori Shinsei':n=n[:4]
 if v in ['OSHA OCHA','Trial Matcha']:n=aliases.get(n,n)
 return norm(v)+'|'+n
merged={key(r['vendor'],r['name']):r for r in new}
assert len(merged)==len(new)
for r in new:
 r.update(rank=None,reason='',fit='',origin='new',price_basis='supplier_quote',legacy_records=[])
for i,(v,n,kg,notes,status) in enumerate(old):
 k=key(v,n)
 history=dict(index=i,vendor=v,name=n,recorded_kg=kg,notes=notes,status=status)
 if k in merged:
  merged[k]['legacy_records'].append(history);merged[k]['origin']='updated'
  continue
 retail=(v in ['Seasonal Matcha','Trial Matcha'] and '100g' in notes)
 r=dict(vendor=v,name=n,kg=None if retail else kg,notes=notes,source='legacy',pack=notes if retail or kg is None else f'ราคาเดิม 1kg {kg:,.0f} บาท',evidence='ข้อมูลเดิมในเว็บ • ยังไม่มีผลชิมจากผู้ใช้',status='ราคา/สต็อกอ้างอิงเดิม ยังไม่ได้ยืนยันรอบปัจจุบัน',rank=None,reason='',fit='',origin='old',price_basis='retail_equivalent' if retail else 'archived_kg_quote',legacy_records=[history],legacy_status=status)
 if retail:r['reference_kg_equivalent']=kg
 if v=='Midori Shinsei' and kg is not None:
  r.update(kg=round(kg*1.07,2),pack=f'ราคาเดิม 1kg {kg:,.0f} ก่อน VAT + 7% = {kg*1.07:,.2f}',price_basis='archived_quote_plus_vat')
 merged[k]=r
removed=merged.pop(key('Koyo Tearoom','S-EU FF (Cafe · Shizuoka)'))
removed.update(rank=None,assessment='นำออกตามผู้ใช้: ไม่มีในรายการส่งล่าสุดของ Koyo',removed_at='2026-09-26')
rows=list(merged.values())
# Explicit editorial comparison: price is a ceiling, not a minimum; no brand quota.
selection=[
('OSHA OCHA','Kagoshima P01','rice milk / floral / avocado / mango sticky rice; ราคา 5.27 บาท/g และเป็นอันดับ 1 ที่คุณเลือก แม้ยังมี nuts ร่วม','อันดับ 1 ตามผู้ใช้'),
('OSHA OCHA','Fuyu no Kaze','ชิมแล้วชอบจริง; grilled seaweed / avocado / creamy เพิ่มมิติจากถั่วอบ-ถั่วต้ม ในราคา 6.90 บาท/g','ต่างบางส่วน / ชอบจริง'),
('OSHA OCHA','Saga Seimei','ข้าวนึ่ง / floral / fruity / avocado มีแนวรสเพิ่มจากถั่วอบ ราคาเดิม 8.59 บาท/g','ข้าวนึ่งและผลไม้'),
('Ryn','Organic Saemidori','Floral mochi เพิ่มความหอมหวาน แต่ snow peas ยังทับถั่วต้มบางส่วน; ราคาใบเดิม 10 บาท/g และราคาแพ็กออนไลน์ยังจับคู่ไม่ได้','floral mochi / ซ้ำถั่วบางส่วน'),
('OSHA OCHA','Shizuoka Yabukita Organic','Seaweed / fruity floral ในบันทึกเดิม เหมาะเป็นทางรสเพิ่มจาก Ureshino; ราคาเดิม 8.815 บาท/g','ทะเลและดอกไม้ผลไม้'),
('SHIKA','Kyoto Basic','Seaweed / milky ในราคาเดิม 5.90 บาท/g ถูกกว่า Trial Uji Premium; ต้องลองความขมตามโน้ต ไม่อนุมานว่าอร่อยกว่าเพราะถูก','สาหร่ายและนม / มีความขม'),
('WARDEN','UJI No.6','Creamy seaweed ในสูตรนมมีหลักฐานจากใบสินค้า; 9.45 บาท/g รวม VAT; ชงใสอาจขม','ครีมมี่สาหร่าย'),
('Koyo Tearoom','NATSU (Premium · Uji)','Vegetal / fresh / mild bitter ราคาเดิม 6.90 บาท/g เพิ่มโทนเขียวสด ไม่ย้ำถั่วคั่ว; เคยระบุสินค้าจำกัด','เขียวสด / ขมอ่อน'),
('Rinya Matcha','Yame Green Dots (Premium)','หญ้าและดอกไม้เล็กน้อย ราคาเดิม 6.70 บาท/g; เป็นคนละรุ่นกับ Ureshino ที่ซื้อแล้ว และมีบันทึกว่าเหมาะน้ำมะพร้าว','เขียวและดอกไม้'),
('Trial Matcha','Uji Premium','Grassy / seaweed / nutty มีข้อมูลรสจากร้าน จึงยังติดอันดับ; 9.80 บาท/g ไม่ใช่ราคาถูกที่สุดและยังมีถั่วร่วม','เขียวสาหร่าย / ซ้ำถั่วบางส่วน'),
('SHIKA','Yame Café','Lightly nutty / seaweed / mellow / smooth ราคาเดิม 6.25 บาท/g; ยังมีถั่ว แต่สาหร่ายและความนุ่มน่าลองเทียบ','สาหร่ายนุ่ม / ถั่วบางส่วน'),
('OSHA OCHA','Yame C03','Nori / floral nutty / strong coconut เพิ่มกลิ่นมะพร้าวชัดในบันทึกเดิม; 10.50 บาท/g; ไม่ใช่ Kagoshima C02','มะพร้าวและโนริ / ถั่วบางส่วน'),
('WARDEN','UJI No.5','ครีมแมคคาเดเมียในนมและ mild seaweed ชงใส; 10.65 บาท/g รวม VAT แต่แมคคาเดเมียยังทับโทนถั่ว','ครีมมี่ / ถั่วบางส่วน'),
('Koyo Tearoom','YUGIRI (Ceremonial · Uji)','Seaweed / rich aroma / umami ต่างทางจากถั่วอบ; ราคาเดิม 12.90 บาท/g ชิดเพดาน และเคยระบุสินค้าจำกัด','สาหร่ายอูมามิ / ใกล้เพดาน'),
('CHaEN','Chiran Kirari31','Corn / herb เป็นทางเลือกไม่เน้นสาหร่ายหรือถั่ว; 11.50 บาท/g แพงกว่ากลุ่มอันดับต้นและยังไม่ชิม','ข้าวโพดและสมุนไพร'),
('OSHA OCHA','Kagoshima C02','Avocado / malt / floral / roasted nut-rice; ราคา 8.95 บาท/g; supplier ระบุถั่วคั่วชัดกว่า P01 จึงลดอันดับเพราะเสี่ยงซ้ำ Ureshino','มอลต์ดอกไม้ / ถั่วคั่วอาจซ้ำ'),
('Koyo Tearoom','S-TSUYU SF (Cafe · Shizuoka)','Green / grassy / high body ในราคาเดิม 3.90 บาท/g; เป็นทางลองโทนเขียวที่ประหยัด ยังไม่มีหลักฐานว่าละมุนหรือถูกปาก','เขียวและบอดี้'),
('OSHA OCHA','Saga Yabukita','Coconut milk / avocado / almond ราคาเดิม 10.50 บาท/g; มะพร้าวน่าสนใจ แต่ยังมีอัลมอนด์ร่วมจึงไม่จัดสูง','นมมะพร้าว / ถั่วบางส่วน'),
('WARDEN','UJI No.7','Creamy seaweed ราคา 7.80 บาท/g รวม VAT; อยู่ท้ายเพราะ supplier แนะนำเติมหวานและไม่แนะนำชงใส','สาหร่ายในนม / จำกัดการใช้งาน'),
('CHaEN','DAI','Cookie / wheatgrass ในใบสินค้าใหม่ ราคา 4.80 บาท/g; เป็นตัวลองแนวคุกกี้และเขียวแทนถั่ว ยังไม่มีผลชิมจริงจึงอยู่ท้าย','คุกกี้และเขียว')]
for rank,(v,n,reason,fit) in enumerate(selection,1):
 r=merged[key(v,n)];r.update(rank=rank,reason=reason,fit=fit)
for r in rows:
 if r.get('rank'):r['assessment']='ติด Top 20';continue
 if r['vendor']=='Rinya Matcha' and 'Ureshino' in r['name']:
  r['assessment']='ไม่จัดอันดับ: ตัดกลุ่ม Ureshino ตามคำขอ'
 elif re.search(r'hojicha|houjicha|genmai|gyokuro|sencha|white tea',r['name'],re.I):
  r['assessment']='ไม่จัดอันดับ: ชาประเภทอื่น แยกจากผงมัทฉะ'
 elif r['kg'] is None:r['assessment']='ไม่จัดอันดับ: ไม่มีใบราคา kg ที่เทียบได้'
 elif r['kg']>13000:r['assessment']='ไม่จัดอันดับ: เกินเพดาน 13 บาท/g'
 elif 'sold out' in (r['status']+' '+r.get('legacy_status','')).lower():r['assessment']='รายการติดตาม: เคยระบุหมด ยังไม่ยืนยันรอบใหม่'
 else:r['assessment']='ไม่ติดรอบนี้: หลักฐานรสต่างจากฐานเดิมหรือความคุ้มค่ายังไม่เด่นพอเมื่อเทียบผู้ผ่าน'
 if r['vendor']=='Trial Matcha' and r['name'] in ['Uji Premium upper','Shizuoka Premium','Organic Nishio cafe']:
  r['assessment']='ถอดจากอันดับเดิม: อยู่ในงบอย่างเดียวไม่พอ ยังไม่มีโน้ตรุ่นที่ยืนยัน'
 if r['vendor']=='Trial Matcha' and r['name']=='Kagoshima Ceremonial':r['assessment']='ถอดจากอันดับเดิม: floral/spinach แต่มี edamame ต้ม จึงมีตัวอื่นเพิ่มรสได้ชัดกว่า'
d.update(rows=rows,updated='2026-09-26',revision='all-catalog-top20-20260926',ranking_note='คัดจากเก่า184+ใหม่97 รวมรายการซ้ำ ใช้ข้อมูลใหม่แทนราคาเก่า; ไม่มีโควตาแบรนด์; P01 อันดับ1ตามผู้ใช้; ลำดับอื่นเป็นการประเมินจากโน้ต ความชอบจริง ราคาและข้อจำกัด ไม่ใช่ผลชิมโดยผู้ช่วย',coverage=dict(legacy_rows=len(old),new_rows=len(new),input_rows=len(old)+len(new),merged_rows=len(rows),merged_duplicates=len(old)+len(new)-len(rows)-1,removed_rows=1,old_rows_accounted=sum(len(r['legacy_records']) for r in rows)+len(removed['legacy_records']),ranked_old=sum(r['origin']=='old' for r in rows if r.get('rank')),ranked_trial=sum(r['vendor']=='Trial Matcha' for r in rows if r.get('rank'))),legacy_snapshot=old,excluded_items=[removed])
assert d['coverage']['old_rows_accounted']==184
assert len([r for r in rows if r.get('rank')])==20
assert all(r['kg'] is not None and r['kg']<=13000 for r in rows if r.get('rank'))
for name in ['buying-data.json','buying-data.js']:
 (P/name).write_text(('window.KifunBuyingData = ' if name.endswith('.js') else '')+json.dumps(d,ensure_ascii=False,indent=2)+(';' if name.endswith('.js') else ''),encoding='utf8')
print(json.dumps(d['coverage']))
for r in sorted([r for r in rows if r.get('rank')],key=lambda r:r['rank']):print(r['rank'],r['vendor'],r['name'],r['kg'],r['origin'])
