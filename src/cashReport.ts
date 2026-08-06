import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const brl=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const qty=(v:number)=>`${v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:3})} L`;
const time=(v:string)=>new Date(v).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const date=(v:string)=>new Date(v).toLocaleDateString('pt-BR');
const debit=(type:string)=>['Saída','Sangria','Despesa'].includes(type);

async function logoData(){try{const blob=await fetch('/logo-posto.png').then(r=>r.blob());return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob)})}catch{return null}}

export async function generateCashReport(state:any,session:any,preview=false){
 const previewWindow=preview?window.open('about:blank','_blank'):null;
 const closedAt=session.closedAt||new Date().toISOString();
 const moves=state.cashMoves.filter((m:any)=>m.cashId===session.id);
 const saleIds=new Set(moves.filter((m:any)=>m.type==='Venda'&&m.refId).map((m:any)=>m.refId));
 const sales=state.sales.filter((s:any)=>saleIds.has(s.id)&&s.status==='Ativa').sort((a:any,b:any)=>a.date.localeCompare(b.date));
 const salesTotal=sales.reduce((a:number,s:any)=>a+s.total,0), litersTotal=sales.reduce((a:number,s:any)=>a+s.liters,0);
 const sangrias=moves.filter((m:any)=>m.type==='Sangria'), supplies=moves.filter((m:any)=>m.type==='Suprimento');
 const outputs=moves.filter((m:any)=>['Saída','Despesa'].includes(m.type));
 const otherEntries=moves.filter((m:any)=>['Entrada','Recebimento'].includes(m.type));
 const sum=(xs:any[])=>xs.reduce((a,m)=>a+m.value,0);
 const expected=session.opening+moves.reduce((a:number,m:any)=>a+(debit(m.type)?-m.value:m.value),0);
 const declared=Number(session.closingDeclared??expected), difference=declared-expected;
 const doc=new jsPDF({unit:'mm',format:'a4'}); const navy:[number,number,number]=[8,44,99];
 const addFooter=()=>{const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setDrawColor(220);doc.line(14,282,196,282);doc.setFontSize(8);doc.setTextColor(100);doc.text(`Posto dos Cerrados - Relatório de Fechamento de Caixa | Emitido em ${new Date().toLocaleString('pt-BR')} | Usuário: ${session.operator}`,14,287);doc.text(`Página ${i} de ${pages}`,196,287,{align:'right'})}};
 const section=(title:string)=>{let y=(doc as any).lastAutoTable?.finalY||56;if(y>255){doc.addPage();y=18}doc.setFontSize(12);doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.text(title,14,y+9);return y+12};
 const table=(title:string,head:string[],body:any[][],foot?:any[][])=>{const y=section(title);autoTable(doc,{startY:y,head:[head],body,foot,theme:'grid',styles:{fontSize:8,cellPadding:2.2},headStyles:{fillColor:[226,236,249],textColor:navy,fontStyle:'bold'},footStyles:{fillColor:[241,245,249],textColor:navy,fontStyle:'bold'},margin:{left:14,right:14,bottom:18},rowPageBreak:'avoid',showHead:'everyPage'})};
 const logo=await logoData(); if(logo)doc.addImage(logo,'PNG',14,10,30,18);
 doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('POSTO DOS CERRADOS',50,16);doc.setFontSize(9);doc.text('Gestão do Posto',50,22);doc.setFontSize(16);doc.text('RELATÓRIO DE FECHAMENTO DE CAIXA',105,34,{align:'center'});doc.setDrawColor(210);doc.line(14,39,196,39);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text(`Data: ${date(closedAt)}  |  Abertura: ${time(session.openedAt)}  |  Fechamento: ${time(closedAt)}`,14,46);doc.text(`Operador: ${session.operator}  |  Caixa/Turno: ${session.id}`,14,52);
 table('RESUMO DO CAIXA',['Descrição','Valor'],[['Saldo Inicial',brl(session.opening)],['Vendas',brl(salesTotal)],['Outras Entradas',brl(sum(otherEntries))],['Suprimentos',brl(sum(supplies))],['Saídas',brl(sum(outputs))],['Sangrias',brl(sum(sangrias))],['Saldo Esperado',brl(expected)],['Valor Contado',brl(declared)],['Diferença',brl(difference)]]);
 table('RESUMO DAS VENDAS',['Indicador','Resultado'],[['Vendas realizadas',String(sales.length)],['Faturamento',brl(salesTotal)],['Combustível vendido',qty(litersTotal)],['Ticket médio',brl(sales.length?salesTotal/sales.length:0)]]);
 const fuels=state.fuels.map((f:any)=>{const rows=sales.filter((s:any)=>s.fuelId===f.id);return [f.name,qty(rows.reduce((a:number,s:any)=>a+s.liters,0)),String(rows.length),brl(rows.reduce((a:number,s:any)=>a+s.total,0))]}).filter((r:any[])=>r[2]!=='0');
 table('VENDAS POR COMBUSTÍVEL',['Combustível','Litros','Vendas','Valor'],fuels,[['TOTAL',qty(litersTotal),String(sales.length),brl(salesTotal)]]);
 const methods=[...new Set(sales.map((s:any)=>s.payment))].map(method=>{const rows=sales.filter((s:any)=>s.payment===method);return [method,String(rows.length),brl(rows.reduce((a:number,s:any)=>a+s.total,0))]});
 table('VENDAS POR FORMA DE PAGAMENTO',['Forma','Quantidade','Valor'],methods,[['TOTAL',String(sales.length),brl(salesTotal)]]);
 const credit=sales.filter((s:any)=>s.payment==='Prazo');if(credit.length)table('VENDAS A PRAZO / CONTAS A RECEBER',['Cliente','Hora','Combustível','Litros','Valor','Vencimento','Status'],credit.map((s:any)=>{const rec=state.receivables.find((r:any)=>r.saleId===s.id),client=state.clients.find((c:any)=>c.id===s.clientId),fuel=state.fuels.find((f:any)=>f.id===s.fuelId);return[client?.name||'-',time(s.date),fuel?.name||'-',qty(s.liters),brl(s.total),rec?.due?date(rec.due+'T12:00:00'):'-',rec?.status||'-']}));
 table('VENDAS DO PERÍODO',['Hora','Combustível','Litros','Preço/L','Valor','Pagamento','Cliente','Funcionário'],sales.map((s:any)=>[time(s.date),state.fuels.find((f:any)=>f.id===s.fuelId)?.name||'-',qty(s.liters),brl(s.price),brl(s.total),s.payment,state.clients.find((c:any)=>c.id===s.clientId)?.name||'Consumidor',state.employees.find((e:any)=>e.id===s.employeeId)?.name||'-']));
 table('MOVIMENTAÇÕES DO CAIXA',['Hora','Tipo','Descrição','Usuário','Valor'],moves.slice().sort((a:any,b:any)=>a.date.localeCompare(b.date)).map((m:any)=>[time(m.date),m.type,m.description,session.operator,`${debit(m.type)?'-':'+'}${brl(m.value)}`]));
 if(sangrias.length)table('SANGRIAS REALIZADAS',['Hora','Descrição/Motivo','Usuário','Valor'],sangrias.map((m:any)=>[time(m.date),m.description,session.operator,brl(m.value)]),[['','','Total',brl(sum(sangrias))]]);
 if(supplies.length)table('SUPRIMENTOS DO CAIXA',['Hora','Descrição','Usuário','Valor'],supplies.map((m:any)=>[time(m.date),m.description,session.operator,brl(m.value)]),[['','','Total',brl(sum(supplies))]]);
 if(outputs.length)table('SAÍDAS DO CAIXA',['Hora','Descrição','Categoria','Usuário','Valor'],outputs.map((m:any)=>[time(m.date),m.description,m.type,session.operator,brl(m.value)]),[['','','','Total',brl(sum(outputs))]]);
 table('CONFERÊNCIA DO CAIXA',['Saldo esperado','Valor contado','Diferença'],[[brl(expected),brl(declared),brl(difference)]]);addFooter();
 const filename=`fechamento-caixa-${date(closedAt).split('/').join('-')}-${session.id}.pdf`;if(preview){const url=URL.createObjectURL(doc.output('blob'));if(previewWindow)previewWindow.location.href=url;else doc.save(filename)}else doc.save(filename);
 return {filename,salesTotal,expected,declared,difference,salesCount:sales.length};
}
