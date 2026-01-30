// ==================================================
// App.jsx
// MyCafe – Root Application Router (UI Only)
// ==================================================

import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./AppLayout";

// Pages
import AnaEkran from "../pages/AnaEkran/AnaEkran";
import Masalar from "../pages/Masalar/Masalar";
import Adisyon from "../pages/Adisyon/Adisyon";
import Bilardo from "../pages/Bilardo/Bilardo";
import Kategoriler from "../pages/Kategoriler/Kategoriler";
import UrunStokYonetimi from "../pages/UrunStokYonetimi/UrunStokYonetimi";
import Stok from "../pages/Stok/Stok";
import MusteriIslemleri from "../pages/MusteriIslemleri/MusteriIslemleri";
import Personel from "../pages/Personel/Personel";
import Raporlar from "../pages/Raporlar/Raporlar";
import Redirect from "../pages/Redirect";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<AnaEkran />} />
          <Route path="/masalar" element={<Masalar />} />
          <Route path="/adisyon/:id" element={<Adisyon />} />
          <Route path="/bilardo" element={<Bilardo />} />
          <Route path="/kategoriler" element={<Kategoriler />} />
          <Route path="/urun-stok-yonetimi" element={<UrunStokYonetimi />} />
          <Route path="/stok" element={<Stok />} />
          <Route path="/musteri-islemleri" element={<MusteriIslemleri />} />
          <Route path="/personel" element={<Personel />} />
          <Route path="/raporlar/*" element={<Raporlar />} />
          <Route path="*" element={<Redirect />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
