// Native semantic controls. Designer #207 icon/source adoption is reviewed separately.
const paths={board:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',room:'M4 21V4l12-2v19 M16 7h4v14 M11 12h1',actions:'m13 2-9 12h7l-1 8 10-13h-8z',card:'M5 3h14v18H5z M9 8h6 M9 12h6 M9 16h3',panels:'m12 3 10 5-10 5L2 8z M3 12l9 5 9-5 M3 17l9 5 9-5',pass:'m5 4 12 8L5 20z M20 4v16',vote:'m7 10 4 4 7-9 M4 12H2v9h20v-9h-3',promises:'m2 8 5-4 5 2 5-2 5 4-3 8-5 4-4-3-4-1z M7 8l4-2 5 5-3 3-5-3',settings:'M12 5h.01 M12 12h.01 M12 19h.01',close:'m6 6 12 12 M6 18 18 6',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v6l4 2'};
Object.assign(paths,{
 move:'M3 12h18 M7 8l-4 4 4 4 M17 8l4 4-4 4',
 scan:'M4 8V4h4 M16 4h4v4 M20 16v4h-4 M8 20H4v-4 M8 12h8 M12 8v8',
 target:'M3 12h5 M16 12h5 M12 3v5 M12 16v5 M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12',
 shield:'m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5z M8 11l3 3 5-6',
 medical:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
 supply:'m3 7 9-4 9 4v13H3z M3 7l9 4 9-4 M12 11v9 M8 5l9 4',
 code:'m8 5-6 7 6 7 M16 5l6 7-6 7 M14 3l-4 18',
 ship:'m12 2 7 12h-4v5H9v-5H5z M8 22l2-3 M16 22l-2-3',
 suppress:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M6 6l12 12',
 blackhole:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M2 14c-1-6 18-12 20-5s-18 13-20 5',
 clone:'M3 3h12v12H3z M9 18v3h12V9h-3 M7 8h4 M9 6v4',
 blackout:'M13 2a9 9 0 1 0 9 12A9 9 0 0 1 13 2z',
 unlock:'M7 10V6a5 5 0 0 1 9-3 M4 10h16v12H4z M12 15v3',
 eject:'m12 3 8 11H4z M4 19h16 M4 22h16',
 badge:'m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z',
 compass:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 m4 5-3 7-7 3 3-7z',
 talk:'M3 3h18v13H9l-6 5z M7 7h10 M7 11h7',
 check:'m4 12 5 5L20 6',
 window:'M3 3h18v18H3z M12 3v18 M3 12h18',
 people:'M8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M2 21v-5a6 6 0 0 1 12 0v5 M17 4a3 3 0 1 1 0 6 M17 13a5 5 0 0 1 5 5v3',
 list:'M3 5h1 M8 5h13 M3 12h1 M8 12h13 M3 19h1 M8 19h13',
});
const actionIcons={PASS_TURN:'pass',MOVE:'move',REGISTER_SHOT:'target',PROTECT:'shield',RESCUE:'medical',SUPPLY:'supply',SCAN:'scan',SUBMIT_CODE:'code',ACTIVATE_SHIP_HACK:'ship',ENGINEER_SUPPRESS:'suppress',ACTIVATE_BLACKHOLE:'blackhole',ACTIVATE_CLONE:'clone',REQUEST_BLACKOUT:'blackout',SELECT_BLACKOUT_SLOT:'target',CAPTAIN_RELEASE:'unlock',CAPTAIN_EJECT:'eject',APPOINT_OFFICER:'badge',BLOCK_MOVE:'suppress',CHOOSE_NAV_DIRECTION:'compass',CONFIRM_NAVIGATION:'check',VOTE:'vote',REQUEST_HACK:'talk',DECLARE_HACK_SIDE:'talk',PANEL_CODE:'medical',OFFER_PROMISE:'promises',ACCEPT_PROMISE:'check',DECLINE_PROMISE:'close',SHOW_WINDOW:'window'};
export const phoneActionIcon=type=>actionIcons[type]??'actions';
export const phonePanelIcon=panel=>({windows:'window',navigation:'compass',hospital:'medical',players:'people','round-order':'list'})[panel]??'panels';
export function phoneIcon(document,name){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('planet-icon');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]??paths.actions);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width',name==='settings'?'3.8':'1.8');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);return svg;
}
export function labelPhoneControl(node,label,icon){node.replaceChildren(phoneIcon(node.ownerDocument,icon));const text=node.ownerDocument.createElement('span');text.className='planet-control-label';text.textContent=label;node.append(text);node.setAttribute('aria-label',label);node.title=label;return node;}
