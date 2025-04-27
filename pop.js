console.log('popup.js loaded');
function rgbToHex(color) {
  const m = color.match(/\d+/g);
  if (!m) return '#ffffff';
  return '#' + m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('');
}
document.addEventListener('DOMContentLoaded',()=>{
  chrome.tabs.query({active:true,currentWindow:true},tabs=>{
    chrome.tabs.sendMessage(tabs[0].id,{type:'REQUEST_RULES'},items=>{
      const c=document.getElementById('list');
      if(!items||!items.length){ c.textContent='No bright colors found.'; return }
      items.forEach(item=>{
        const label=document.createElement('label');
        label.textContent=item.type==='rule'?item.selector:`inline #${item.id}`;
        const input=document.createElement('input');
        input.type='color'; input.value=rgbToHex(item.value);
        input.addEventListener('input',e=>{
          chrome.tabs.sendMessage(tabs[0].id,{
            type:'UPDATE_COLOR',
            payload:{...item,value:e.target.value}
          });
        });
        label.appendChild(input);
        c.appendChild(label);
      });
    });
  });
});

