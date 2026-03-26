import { db, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from './firebase.js';

// ==== DOM ELEMENTS ====
const username = document.getElementById("username");
const password = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");
const loginPage = document.getElementById("loginPage");
const appDiv = document.getElementById("app");

const menuList = document.getElementById("menuList");
const cartList = document.getElementById("cartList");
const riwayatDiv = document.getElementById("riwayat");

const nama = document.getElementById("nama");
const harga = document.getElementById("harga");
const bayarInput = document.getElementById("bayar");
const totalDisplay = document.getElementById("total");
const totalHarianDisplay = document.getElementById("totalHarian");
const kembalianDisplay = document.getElementById("kembalian");

// ==== LOGIN ====
const user = { username: "admin", password: "123" };
btnLogin.addEventListener("click", login);
password.addEventListener("keyup", e => { if(e.key==="Enter") login(); });

function login(){
  if(username.value===user.username && password.value===user.password){
    loginPage.style.display="none";
    appDiv.style.display="block";
    initRealtime();
  } else alert("Salah");
}

// ==== UTILITY ====
function formatRupiahInput(input){
  let v = input.value.replace(/\D/g,"");
  if(v === "") input.value="";
  else input.value = v.replace(/\B(?=(\d{3})+(?!\d))/g,".");
}

function parseRupiah(v){
  return Number((v||"").replace(/\./g,""));
}

function rupiah(v){
  return Number(v).toLocaleString("id-ID");
}

function getTanggal(){
  let d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getBulan(){
  let d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

// ==== STATE ====
let barang = [];
let cart = [];
let riwayat = [];

// ==== FIREBASE REFERENCES ====
const barangRef = collection(db,"barang");
const riwayatRef = collection(db,"riwayat");

// ==== REALTIME SYNC ====
function initRealtime(){
  onSnapshot(barangRef, snapshot=>{
    barang = snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
    renderMenu();
  });
  onSnapshot(riwayatRef, snapshot=>{
    riwayat = snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
    renderRiwayat();
  });
}

// ==== MENU ====
function renderMenu(){
  menuList.innerHTML="";
  const keyword = document.getElementById("search").value.toLowerCase();
  barang.filter(b=>b.nama.toLowerCase().includes(keyword)).forEach(b=>{
    const d=document.createElement("div");
    d.className="card";
    d.innerHTML=`
      ${b.nama}<br>Rp${rupiah(b.harga)}<br>
      <button class='btn-add' onclick="tambahKeCart('${b.id}')">Tambah</button>
      <button class='btn-edit' onclick="editBarang('${b.id}')">Edit</button>
      <button class='btn-delete' onclick="hapusBarang('${b.id}')">Hapus</button>
    `;
    menuList.appendChild(d);
  });
}

async function tambahBarang(){
  const n = nama.value;
  const h = parseRupiah(harga.value);
  if(!n || !h) return;
  await addDoc(barangRef, { nama: n, harga: h });
  nama.value=""; harga.value="";
}

async function editBarang(id){
  const b = barang.find(x=>x.id===id);
  let h = prompt("Harga baru", rupiah(b.harga));
  if(h){
    h = parseRupiah(h);
    const bDoc = doc(db,"barang",id);
    await updateDoc(bDoc,{harga:h});
  }
}

async function hapusBarang(id){
  const bDoc = doc(db,"barang",id);
  await deleteDoc(bDoc);
}

// ==== CART ====
function tambahKeCart(id){
  const b = barang.find(x=>x.id===id);
  const it = cart.find(x=>x.id===id);
  if(it) it.qty++; else cart.push({id:b.id, nama:b.nama, harga:b.harga, qty:1});
  renderCart();
}

function renderCart(){
  cartList.innerHTML="";
  let total=0;
  cart.forEach((c,i)=>{
    const sub = c.harga*c.qty;
    total += sub;
    const d = document.createElement("div");
    d.className="cart-item";
    d.innerHTML=`
      <div>${c.nama}<br>Rp${rupiah(c.harga)}</div>
      <div>
        <button onclick="kurangQty(${i})">-</button>
        ${c.qty}
        <button onclick="tambahQty(${i})">+</button>
        <button class='btn-delete' onclick="hapusItem(${i})">x</button>
      </div>
    `;
    cartList.appendChild(d);
  });
  totalDisplay.innerText = "Total: Rp" + rupiah(total);
}

function tambahQty(i){ cart[i].qty++; renderCart(); }
function kurangQty(i){ if(cart[i].qty>1) cart[i].qty--; else cart.splice(i,1); renderCart(); }
function hapusItem(i){ cart.splice(i,1); renderCart(); }

function hitungKembalian(){
  const bayar = parseRupiah(bayarInput.value);
  const total = cart.reduce((a,b)=>a+(b.harga*b.qty),0);
  const k = bayar-total;
  kembalianDisplay.innerText = k>=0?"Kembalian: Rp"+rupiah(k):"Kurang";
}

async function selesaiTransaksi(){
  if(cart.length===0) return;
  const total = cart.reduce((a,b)=>a+(b.harga*b.qty),0);
  const data = {
    tgl: new Date().toLocaleString(),
    tanggal: getTanggal(),
    bulan: getBulan(),
    total
  };
  await addDoc(riwayatRef,data);
  cart=[]; bayarInput.value=""; kembalianDisplay.innerText="";
  renderCart();
}

// ==== RIWAYAT ====
function renderRiwayat(){
  riwayatDiv.innerHTML="";
  const today = getTanggal();
  const thisMonth = getBulan();
  let totalHari=0; let totalBulan=0;

  riwayat.forEach(r=>{ if(r.bulan===thisMonth) totalBulan+=r.total; });

  const bulanDiv = document.createElement("div");
  bulanDiv.className="card";
  bulanDiv.innerHTML="Bulan ini: Rp"+rupiah(totalBulan);
  riwayatDiv.appendChild(bulanDiv);

  const riwayatSorted = [...riwayat].sort((a,b)=>new Date(a.tgl)-new Date(b.tgl));

  const titleToday = document.createElement("h4"); titleToday.innerText="Hari Ini";
  riwayatDiv.appendChild(titleToday);
  riwayatSorted.filter(r=>r.tanggal===today).forEach(r=>{
    totalHari += r.total;
    const d = document.createElement("div");
    d.className="card";
    d.innerHTML = `${r.tgl}<br>Rp${rupiah(r.total)}`;
    riwayatDiv.appendChild(d);
  });

  const titleOld = document.createElement("h4"); titleOld.innerText="Sebelumnya";
  riwayatDiv.appendChild(titleOld);
  riwayatSorted.filter(r=>r.tanggal!==today).forEach(r=>{
    const d = document.createElement("div");
    d.className="card";
    d.innerHTML = `${r.tgl}<br>Rp${rupiah(r.total)}`;
    riwayatDiv.appendChild(d);
  });

  totalHarianDisplay.innerText = "Rp"+rupiah(totalHari);
}

// ==== PRINT ====
function printStruk(){
  let text = "TOKO AMANAH FUTURISTIC\n";
  let total=0;
  cart.forEach(c=>{
    const sub = c.harga*c.qty;
    total+=sub;
    text += `${c.nama} x${c.qty} Rp${rupiah(sub)}\n`;
  });
  text += "Total: Rp"+rupiah(total);
  const w = window.open();
  w.document.write("<pre>"+text+"</pre>");
  w.print();
}

// ==== EVENT LISTENERS FOR INPUT FORMAT ====
harga.addEventListener("input",()=>formatRupiahInput(harga));
bayarInput.addEventListener("input",()=>formatRupiahInput(bayarInput));

// ==== GLOBAL FUNCTIONS ====
window.tambahBarang = tambahBarang;
window.tambahKeCart = tambahKeCart;
window.editBarang = editBarang;
window.hapusBarang = hapusBarang;
window.tambahQty = tambahQty;
window.kurangQty = kurangQty;
window.hapusItem = hapusItem;
window.hitungKembalian = hitungKembalian;
window.selesaiTransaksi = selesaiTransaksi;
window.printStruk = printStruk;