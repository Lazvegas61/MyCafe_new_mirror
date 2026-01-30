import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGun } from "../../context/GunContext";

// MyCafe Premium Tema Renkleri
const RENK = {
  arka: "#e5cfa5",
  kart: "#4a3722",
  kartYazi: "#ffffff",
  altin: "#f5d085",
  yesil: "#2ecc71",      // BOŞ masa için
  kirmizi: "#c0392b",    // DOLU masa için
  turuncu: "#e67e22",
};

// --------------------------------------------------
// UTILITY FUNCTIONS
// --------------------------------------------------
const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
};

const normalizeMasa = (masa, index) => {
  if (masa.id && masa.no) return masa;
  
  const no = masa.no ?? masa.id ?? (index + 1);
  return {
    ...masa,
    id: masa.id ?? `masa_${no}`,
    no: no.toString(),
  };
};

const normalizeMasalarList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map((m, index) => normalizeMasa(m, index));
};

const formatSure = (dakika) => {
  if (!dakika || dakika <= 0) return "0 dk";
  const h = Math.floor(dakika / 60);
  const m = dakika % 60;
  if (h > 0) return `${h} sa ${m} dk`;
  return `${m} dk`;
};

const formatTime = (date) => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------
export default function Masalar({ onOpenAdisyon }) {
  const navigate = useNavigate();
  const { gun, gunAktif } = useGun();
  
  // STATE
  const [masalar, setMasalar] = useState(() => {
    const raw = readJSON("mc_masalar", []);
    return normalizeMasalarList(raw);
  });
  const [adisyonlar, setAdisyonlar] = useState(() => readJSON("mc_adisyonlar", []));
  const [seciliMasa, setSeciliMasa] = useState(null);
  const [silMasaNo, setSilMasaNo] = useState("");
  
  // REFS
  const dragSourceMasaNoRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  // --------------------------------------------------
  // DATA MANAGEMENT
  // --------------------------------------------------
  const loadData = useCallback(() => {
    const now = Date.now();
    
    if (now - lastUpdateRef.current < 500 && !window._forceReload) {
      return;
    }
    
    lastUpdateRef.current = now;
    window._forceReload = false;
    
    const rawMasalar = readJSON("mc_masalar", []);
    const rawAdisyonlar = readJSON("mc_adisyonlar", []);
    
    setAdisyonlar(rawAdisyonlar);
    
    // ✅ DÜZELTME #2: Sadeleştirilmiş masalar yükleme
    setMasalar(normalizeMasalarList(rawMasalar));
  }, []);

  const saveMasalar = useCallback((list) => {
    const normalized = list.map((m, index) => normalizeMasa(m, index));
    setMasalar(normalized);
    writeJSON("mc_masalar", normalized);
  }, []);

  const saveAdisyonlar = useCallback((list) => {
    setAdisyonlar(list);
    writeJSON("mc_adisyonlar", list);
  }, []);

  // --------------------------------------------------
  // REAL-TIME UPDATES
  // --------------------------------------------------
  useEffect(() => {
    loadData();
    
    const interval = setInterval(loadData, 2000);
    
    const handleStorageChange = () => {
      window._forceReload = true;
      loadData();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('adisyonGuncellendi', handleStorageChange);
    window.addEventListener('odemelerGuncellendi', handleStorageChange);
    window.addEventListener('gunDurumuDegisti', handleStorageChange);
    window.addEventListener('gunSonuYapildi', handleStorageChange);
    window.addEventListener('masaTasindi', handleStorageChange);
    window.addEventListener('masaKapatildi', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('adisyonGuncellendi', handleStorageChange);
      window.removeEventListener('odemelerGuncellendi', handleStorageChange);
      window.removeEventListener('gunDurumuDegisti', handleStorageChange);
      window.removeEventListener('gunSonuYapildi', handleStorageChange);
      window.removeEventListener('masaTasindi', handleStorageChange);
      window.removeEventListener('masaKapatildi', handleStorageChange);
    };
  }, [loadData]);

  // --------------------------------------------------
  // ANA KARAR FONKSİYONU: getAcikAdisyonForMasa (GÜVENLİ VERSİYON)
  // --------------------------------------------------
  const getAcikAdisyonForMasa = useCallback((masa) => {
    const aktifGunId = gun?.gunId || "";

    // ✅ DÜZELTME #1: Bilardo sızıntısı riskini önleyen güvenli versiyon
    return adisyonlar.find(a =>
      a.parentAdisyonId === null &&
      a.kapali !== true &&
      (a.durum?.toUpperCase() !== "KAPALI") &&
      (!aktifGunId || a.gunId === aktifGunId) &&
      (
        // Eski verilerle uyum için çift kontrol
        a.masaId === masa.id ||
        a.masaNum === masa.no
      )
    ) || null;
  }, [adisyonlar, gun]);

  // --------------------------------------------------
  // MASA BİLGİLERİ - YENİ MANTIK
  // --------------------------------------------------
  const getMasaBilgi = useCallback((masa) => {
    const anaAdisyon = getAcikAdisyonForMasa(masa);

    if (!anaAdisyon) {
      return { acik: false, toplamTutar: 0 };
    }

    const bagliAdisyonlar = adisyonlar.filter(a =>
      a.id === anaAdisyon.id ||
      a.parentAdisyonId === anaAdisyon.id
    );

    let toplamTutar = 0;
    bagliAdisyonlar.forEach(a => {
      const t = parseFloat(
        a.toplamTutar?.toString().replace(" TL", "").replace(",", ".")
      );
      toplamTutar += isNaN(t) ? 0 : t;
    });

    const acilis = new Date(anaAdisyon.acilisZamani);
    const gecenDakika = Math.floor((Date.now() - acilis) / 60000);

    return {
      acik: true,
      anaAdisyon,
      tumAdisyonlar: bagliAdisyonlar,
      toplamTutar,
      gecenDakika,
      acilisSaati: formatTime(acilis)
    };
  }, [adisyonlar, getAcikAdisyonForMasa]);

  // Memoized masa bilgileri
  const masaBilgileri = useMemo(() => {
    const bilgiler = {};
    masalar.forEach(masa => {
      bilgiler[masa.no] = getMasaBilgi(masa);
    });
    return bilgiler;
  }, [masalar, getMasaBilgi]);

  // --------------------------------------------------
  // MASA OPERATIONS
  // --------------------------------------------------
  const handleAddMasa = useCallback(() => {
    if (!gunAktif) {
      alert('❌ Gün başlatılmamış! Günü başlatmak için sidebar\'daki "Gün Başlat" butonunu kullanın.');
      return;
    }
    
    const existingNumbers = masalar.map(m => Number(m.no)).filter(n => !isNaN(n));
    const maxNo = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    
    const nextNo = (maxNo + 1).toString();
    const yeniMasa = {
      id: `masa_${nextNo}`,
      no: nextNo,
      // ⚠️ Artık adisyonId ve durum yok - sadece temel bilgiler
    };
    
    const yeniListe = [...masalar, yeniMasa];
    saveMasalar(yeniListe);
  }, [masalar, saveMasalar, gunAktif]);

  const handleDeleteMasa = useCallback(() => {
    const trimmed = silMasaNo.trim();
    if (!trimmed) return;
    
    const masaNo = trimmed;
    const target = masalar.find(m => m.no === masaNo);
    
    if (!target) {
      alert("Bu numarada bir masa yok.");
      return;
    }
    
    const bilgi = masaBilgileri[masaNo];
    if (bilgi.acik) {
      alert("Açık adisyonu olan masayı silemezsiniz.");
      return;
    }
    
    const yeniListe = masalar.filter(m => m.no !== masaNo);
    saveMasalar(yeniListe);
    setSilMasaNo("");
    
    if (seciliMasa === masaNo) {
      setSeciliMasa(null);
    }
  }, [masalar, silMasaNo, masaBilgileri, seciliMasa, saveMasalar]);

  // --------------------------------------------------
  // DRAG & DROP - MASA TAŞIMA
  // --------------------------------------------------
  const handleDragStart = useCallback((e, masa) => {
    const bilgi = masaBilgileri[masa.no];
    if (!bilgi.acik) return;
    dragSourceMasaNoRef.current = masa.no;
    e.dataTransfer.setData('text/plain', masa.no);
  }, [masaBilgileri]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, targetMasa) => {
    e.preventDefault();
    
    const sourceNo = dragSourceMasaNoRef.current;
    dragSourceMasaNoRef.current = null;
    
    if (!sourceNo || sourceNo === targetMasa.no) return;
    
    const sourceMasa = masalar.find(m => m.no === sourceNo);
    const sourceBilgi = masaBilgileri[sourceNo];
    
    if (!sourceMasa || !sourceBilgi.acik) {
      alert("Kaynak masada taşınacak açık adisyon yok.");
      return;
    }
    
    const targetBilgi = masaBilgileri[targetMasa.no];
    if (targetBilgi.acik) {
      alert("Hedef masada zaten açık adisyon var. Taşıyamazsınız.");
      return;
    }
    
    const anaAdisyon = sourceBilgi.anaAdisyon;
    if (!anaAdisyon) {
      alert("Ana adisyon bulunamadı.");
      return;
    }
    
    const sourceToplam = sourceBilgi.toplamTutar || 0;
    
    console.log('🔄 Masa taşıma başlıyor:', {
      sourceNo,
      targetNo: targetMasa.no,
      anaAdisyonId: anaAdisyon.id,
      tasinacakAdisyonSayisi: sourceBilgi.tumAdisyonlar.length,
      sourceToplam,
    });
    
    // ✅ TÜM ADİSYONLARI GÜNCELLE (masaId, masaNo, masaNum)
    const updatedAdisyonlar = adisyonlar.map(ad => {
      const tasinacakMi = sourceBilgi.tumAdisyonlar.some(a => a.id === ad.id);
      
      if (tasinacakMi) {
        return {
          ...ad,
          masaId: targetMasa.id,
          masaNo: `MASA ${targetMasa.no}`,
          masaNum: targetMasa.no,
          isBilardo: false,
          bilardoMasaId: null,
          guncellemeZamani: new Date().toISOString()
        };
      }
      return ad;
    });
    
    saveAdisyonlar(updatedAdisyonlar);
    
    // ⚠️ Masalar listesinde hiçbir şey değişmez - sadece adisyonlar güncellenir
    // Masalar listesi sadece masa id ve no tutar
    
    // EVENT TETİKLE
    window.dispatchEvent(new CustomEvent('masaTasindi', {
      detail: {
        sourceNo,
        sourceMasaId: sourceMasa.id,
        targetNo: targetMasa.no,
        targetMasaId: targetMasa.id,
        anaAdisyonId: anaAdisyon.id,
        tasinanAdisyonSayisi: sourceBilgi.tumAdisyonlar.length
      }
    }));
    
    window.dispatchEvent(new Event('adisyonGuncellendi'));
    window.dispatchEvent(new Event('masaDurumGuncellendi'));
    
    setSeciliMasa(targetMasa.no);
    window._forceReload = true;
    
    alert(`✅ Masa ${sourceNo} → Masa ${targetMasa.no} taşındı.\n${sourceBilgi.tumAdisyonlar.length} adisyon taşındı.\nToplam: ${sourceToplam.toFixed(2)} TL`);
    
    setTimeout(() => {
      loadData();
    }, 100);
  }, [masalar, masaBilgileri, adisyonlar, saveAdisyonlar, loadData]);

  // --------------------------------------------------
  // CLICK HANDLERS
  // --------------------------------------------------
  const handleSingleClick = useCallback((masa) => {
    setSeciliMasa(masa.no);
  }, []);

  const handleDoubleClick = useCallback((masa) => {
    if (!gunAktif) {
      alert('❌ Gün başlatılmamış! Günü başlatmak için sidebar\'daki "Gün Başlat" butonunu kullanın.');
      return;
    }
    
    const anaAdisyon = getAcikAdisyonForMasa(masa);
    let adisyonId = anaAdisyon?.id;
    
    if (!anaAdisyon) {
      adisyonId = "ad_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      
      const aktifGunId = gun?.gunId || "";
      
      const yeniAdisyon = {
        id: adisyonId,
        masaId: masa.id,
        masaNo: `MASA ${masa.no}`,
        masaNum: masa.no,
        gunId: aktifGunId,
        acilisZamani: new Date().toISOString(),
        kalemler: [],
        odemeler: [],
        indirim: 0,
        hesabaYazKayitlari: [],
        kapali: false,
        isBilardo: false,
        bilardoMasaId: null,
        isSplit: false,
        parentAdisyonId: null,
        durum: "AÇIK",
        musteriAdi: null,
        toplamTutar: "0.00",
        guncellemeZamani: new Date().toISOString()
      };
      
      const yeniAdisyonList = [...adisyonlar, yeniAdisyon];
      saveAdisyonlar(yeniAdisyonList);
      
      // ⚠️ Masalar listesinde hiçbir şey değişmez
      // Sadece adisyon oluşturulur
      
      window.dispatchEvent(new Event('adisyonGuncellendi'));
      window._forceReload = true;
    }
    
    if (typeof onOpenAdisyon === "function") {
      onOpenAdisyon({ masaId: masa.no, adisyonId });
    } else {
      navigate(`/adisyon/${adisyonId}`);
    }
  }, [masalar, adisyonlar, onOpenAdisyon, navigate, saveAdisyonlar, gunAktif, gun, getAcikAdisyonForMasa]);

  // --------------------------------------------------
  // DEBUG
  // --------------------------------------------------
  const debugVerileri = useCallback(() => {
    console.log('🔍 DEBUG Masalar.jsx:', {
      gunAktif,
      gunId: gun?.gunId,
      masalar: masalar.length,
      adisyonlar: adisyonlar.length,
      masaBilgileri: Object.keys(masaBilgileri).length
    });
    
    // Tüm masalar için bilardo adisyonlarını kontrol et
    masalar.forEach(masa => {
      const bilgi = masaBilgileri[masa.no];
      if (bilgi.acik) {
        console.log(`🔍 Masa ${masa.no} (${masa.id}):`, {
          acik: bilgi.acik,
          anaAdisyonId: bilgi.anaAdisyon?.id,
          toplamAdisyon: bilgi.tumAdisyonlar?.length,
          toplamTutar: bilgi.toplamTutar,
        });
      }
    });
  }, [gunAktif, gun, masalar, adisyonlar, masaBilgileri]);

  // --------------------------------------------------
  // RENDER - BİLARDO DEBUG BİLGİSİ
  // --------------------------------------------------
  const aktifMasaSayisi = Object.values(masaBilgileri).filter(b => b.acik).length;
  const bosMasaSayisi = masalar.length - aktifMasaSayisi;
  
  // Debug için: Masa 14 bilgilerini konsola yaz
  useEffect(() => {
    const masa14 = masalar.find(m => m.no === '14');
    if (masa14) {
      const bilgi14 = masaBilgileri['14'];
      if (bilgi14 && bilgi14.acik) {
        console.log('🔍 MASA 14 DETAY (Render):', {
          masaId: masa14.id,
          masaNormal: !masa14.id.startsWith('bilardo_'),
          anaAdisyonId: bilgi14.anaAdisyon?.id,
          toplamTutar: bilgi14.toplamTutar,
          adisyonSayisi: bilgi14.tumAdisyonlar?.length,
          adisyonlar: bilgi14.tumAdisyonlar?.map(a => ({
            id: a.id,
            masaNo: a.masaNo,
            masaNum: a.masaNum,
            isBilardo: a.isBilardo,
            parentAdisyonId: a.parentAdisyonId,
            toplamTutar: a.toplamTutar
          }))
        });
      }
    }
  }, [masalar, masaBilgileri, adisyonlar]);

  return (
    <div
      style={{
        background: RENK.arka,
        minHeight: "100vh",
        padding: "26px",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "40px",
              fontWeight: 900,
              color: "#3a2a14",
              margin: 0,
              marginBottom: "5px",
            }}
          >
            Masalar
          </h1>
          
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            color: gunAktif ? "#27ae60" : "#e74c3c",
            fontWeight: 600,
          }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: gunAktif ? "#2ecc71" : "#e74c3c",
            }}></div>
            <span>{gunAktif ? 'Gün Aktif' : 'Gün Başlatılmamış'}</span>
            <span style={{ color: "#7f8c8d" }}>•</span>
            <span style={{ color: "#7f8c8d", fontWeight: 500 }}>Gün ID: {gun?.gunId?.substring(0, 8) || 'Yok'}</span>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleAddMasa}
            style={{
              padding: "8px 14px",
              borderRadius: "999px",
              border: "none",
              background: "linear-gradient(135deg, rgba(245,208,133,0.95), rgba(228,184,110,0.9))",
              color: "#3a260f",
              fontWeight: 800,
              fontSize: "14px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
              minWidth: "120px",
              transition: "transform 0.2s",
              opacity: gunAktif ? 1 : 0.5,
              cursor: gunAktif ? "pointer" : "not-allowed",
            }}
            onMouseOver={(e) => gunAktif && (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseOut={(e) => gunAktif && (e.currentTarget.style.transform = "scale(1)")}
            title={!gunAktif ? "Gün başlatılmamış" : "Yeni masa ekle"}
          >
            + Masa Ekle
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(74,55,34,0.15)",
              padding: "6px 10px",
              borderRadius: "999px",
              opacity: gunAktif ? 1 : 0.5,
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 600 }}>Masa Sil:</span>
            <input
              type="text"
              placeholder="No"
              value={silMasaNo}
              onChange={(e) => setSilMasaNo(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleDeleteMasa()}
              style={{
                width: "56px",
                padding: "4px 6px",
                borderRadius: "999px",
                border: "1px solid #b89a6a",
                outline: "none",
                fontSize: "13px",
                textAlign: "center",
                fontWeight: 600,
                background: gunAktif ? "#fff" : "#f5f5f5",
              }}
              disabled={!gunAktif}
            />
            <button
              onClick={handleDeleteMasa}
              style={{
                padding: "6px 10px",
                borderRadius: "999px",
                border: "none",
                background: "linear-gradient(135deg, #e74c3c, #c0392b)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "13px",
                transition: "opacity 0.2s",
                opacity: gunAktif ? 1 : 0.5,
              }}
              onMouseOver={(e) => gunAktif && (e.currentTarget.style.opacity = "0.9")}
              onMouseOut={(e) => gunAktif && (e.currentTarget.style.opacity = "1")}
            >
              Sil
            </button>
          </div>

          <button
            onClick={debugVerileri}
            style={{
              padding: "6px 10px",
              borderRadius: "999px",
              border: "none",
              background: "#3498db",
              color: "#fff",
              fontWeight: 600,
              fontSize: "12px",
              cursor: "pointer",
              opacity: 0.7,
            }}
            title="Verileri konsola yaz"
          >
            🔍 Debug
          </button>
        </div>
      </div>

      {/* GÜN BİLGİSİ UYARISI */}
      {!gunAktif && (
        <div style={{
          background: "rgba(231, 76, 60, 0.1)",
          padding: "12px 18px",
          borderRadius: "12px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          border: "1px solid #e74c3c",
        }}>
          <div style={{ fontSize: "24px", color: "#e74c3c" }}>ℹ️</div>
          <div>
            <div style={{ fontWeight: 700, color: "#e74c3c" }}>Gün başlatılmamış</div>
            <div style={{ fontSize: "14px", color: "#636e72" }}>
              Masaları kullanmak için önce günü başlatın. Gün başlatma işlemi için sidebar'daki "Gün Başlat" butonunu kullanın.
            </div>
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {masalar.length === 0 ? (
        <div
          style={{
            fontSize: "16px",
            color: "#7f8c8d",
            textAlign: "center",
            padding: "60px 20px",
            background: "rgba(255,255,255,0.3)",
            borderRadius: "20px",
            marginBottom: "30px",
          }}
        >
          {gunAktif ? 
            'Henüz masa yok. Sağ üstten "+ Masa Ekle" ile masa oluşturabilirsiniz.' :
            'Gün başlatılmamış. Masaları kullanmak için sidebar\'dan günü başlatın.'
          }
        </div>
      ) : (
        <>
          {/* DURUM BİLGİSİ */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            padding: "10px 15px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: "12px",
            fontSize: "14px",
          }}>
            <div style={{ display: "flex", gap: "20px" }}>
              <div>
                <span style={{ fontWeight: 600, color: "#3a2a14" }}>Toplam Masa:</span>
                <span style={{ marginLeft: "5px", fontWeight: 700 }}>{masalar.length}</span>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "#3a2a14" }}>Açık Masa:</span>
                <span style={{ marginLeft: "5px", fontWeight: 700, color: RENK.kirmizi }}>
                  {aktifMasaSayisi}
                </span>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "#3a2a14" }}>Boş Masa:</span>
                <span style={{ marginLeft: "5px", fontWeight: 700, color: RENK.yesil }}>
                  {bosMasaSayisi}
                </span>
              </div>
            </div>
            
            <div style={{ 
              fontSize: "12px", 
              color: "#7f8c8d",
              fontStyle: "italic" 
            }}>
              📍 Dolu masaları sürükleyerek taşıyabilirsiniz
            </div>
          </div>

          {/* TABLE GRID - SADELEŞTİRİLMİŞ */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "20px",
            }}
          >
            {masalar.map((masa) => {
              const bilgi = masaBilgileri[masa.no];
              const acik = bilgi.acik;
              const isSelected = seciliMasa === masa.no;
              
              const masaRengi = acik ? RENK.kirmizi : RENK.yesil;
              const toplamAdisyonSayisi = bilgi.tumAdisyonlar?.length || 0;
              
              // Debug için: Masa 14 özel renk
              const ozelRenk = masa.no === '14' && acik ? '#d63031' : masaRengi;
              
              return (
                <div
                  // ✅ DÜZELTME #3: Daha güvenli key kullanımı
                  key={masa.id}
                  draggable={acik && gunAktif}
                  onDragStart={(e) => handleDragStart(e, masa)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, masa)}
                  onClick={() => handleSingleClick(masa)}
                  onDoubleClick={() => handleDoubleClick(masa)}
                  style={{
                    background: ozelRenk,
                    color: "#ffffff",
                    borderRadius: "16px",
                    height: "140px",
                    padding: "20px 16px",
                    cursor: gunAktif ? "pointer" : "not-allowed",
                    textAlign: "center",
                    boxShadow: isSelected
                      ? `0 0 0 3px ${RENK.altin}, 0 8px 16px rgba(0,0,0,0.3)`
                      : "0 6px 12px rgba(0,0,0,0.2)",
                    transition: "all 0.15s ease",
                    position: "relative",
                    overflow: "hidden",
                    opacity: gunAktif ? 1 : 0.7,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                  onMouseOver={(e) => gunAktif && (e.currentTarget.style.transform = "translateY(-4px)")}
                  onMouseOut={(e) => gunAktif && (e.currentTarget.style.transform = "translateY(0)")}
                >
                  {/* MASA NUMARASI - BÜYÜK VE ORTA */}
                  <div
                    style={{
                      fontSize: "42px",
                      fontWeight: 900,
                      color: "#ffffff",
                      textShadow: "0 3px 6px rgba(0,0,0,0.4)",
                      lineHeight: 1,
                      marginTop: "5px",
                    }}
                  >
                    {masa.no}
                  </div>

                  {/* TOPLAM TUTAR - NET VE BÜYÜK */}
                  <div
                    style={{
                      width: "100%",
                    }}
                  >
                    {acik ? (
                      <>
                        <div style={{ 
                          fontSize: "22px", 
                          fontWeight: 800,
                          color: "#ffffff",
                          textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                          marginBottom: "4px",
                        }}>
                          ₺ {(bilgi.toplamTutar || 0).toFixed(2)}
                        </div>
                        
                        {/* ADİSYON SAYISI BİLGİSİ */}
                        {toplamAdisyonSayisi > 1 && (
                          <div style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.9)",
                            background: "rgba(0,0,0,0.2)",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            display: "inline-block",
                          }}>
                            {toplamAdisyonSayisi} adisyon
                          </div>
                        )}
                        
                        {/* SÜRÜKLEME İPUCU */}
                        {gunAktif && (
                          <div style={{
                            fontSize: "10px",
                            opacity: 0.8,
                            marginTop: "8px",
                            color: "rgba(255,255,255,0.8)",
                          }}>
                            📍 Sürükle
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ 
                        fontSize: "24px", 
                        fontWeight: 700, 
                        opacity: 0.9,
                        color: "rgba(255,255,255,0.9)",
                      }}>
                        BOŞ
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      
      {/* FOOTER INFO */}
      <div
        style={{
          marginTop: "30px",
          fontSize: "13px",
          color: "#7f8c8d",
          textAlign: "center",
          padding: "10px",
          borderTop: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <div>
          Toplam {masalar.length} masa • 
          <span style={{ color: RENK.kirmizi, fontWeight: 600 }}> {aktifMasaSayisi} DOLU</span> • 
          <span style={{ color: RENK.yesil, fontWeight: 600 }}> {bosMasaSayisi} BOŞ</span>
        </div>
        <div style={{ fontSize: "11px", marginTop: "4px", opacity: 0.7 }}>
          {gunAktif ? 
            'Anlık güncelleme aktif • Çift tıklayarak adisyon açabilirsiniz' :
            'Gün başlatılmadan işlem yapılamaz • Gün başlatmak için sidebar\'ı kullanın'
          }
        </div>
      </div>
    </div>
  );
}