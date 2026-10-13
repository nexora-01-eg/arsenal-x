import type { XCodeItem } from './indexer';

// محرك الجودة الفئوية — كل نوع بمنطقه الخاص، من حقول حقيقية فقط
// (الحجم، الصيغة، الوسوم، المصدر، حداثة الملف، اكتمال العائلة)
// لا دقة أبعاد/بت-ريت خادميًا — تُقرأ عميلًا عند العرض

export interface Quality {
  score: number;
  reasons: string[];
}

const ARABIC_FAMS = /amiri|aref|cairo|tajawal|almarai|arab|kufi|naskh|ruqaa|thuluth|droid.*arab|noto.*arab|خطوط/i;

function base(it: XCodeItem): { s: number; r: string[] } {
  let s = Math.log10(it.size + 10);
  const r: string[] = [];
  const age = it.mtimeMs ? Date.now() - it.mtimeMs : Infinity;
  if (age < 90 * 86400000) { s += 0.5; r.push('اكتشاف حديث'); }
  if ((it.tags || []).includes('اختبار')) { s -= 8; }
  return { s, r };
}

export function scoreImage(it: XCodeItem): Quality {
  const { s: b, r } = base(it);
  let s = b;
  if (['avif', 'webp'].includes(it.ext)) { s += 1.5; r.push('صيغة حديثة'); }
  else if (['png', 'jpg', 'jpeg'].includes(it.ext)) s += 0.5;
  else if (it.ext === 'gif') { s += 0.3; r.push('متحركة'); }
  else if (it.ext === 'bmp') s -= 1;
  if (it.size > 2 * 1048576) { s += 1; r.push('دقة عالية'); }
  return { score: s, reasons: r };
}

export function scoreVideo(it: XCodeItem): Quality {
  const { s: b, r } = base(it);
  let s = b;
  if (['mp4', 'webm'].includes(it.ext)) { s += 1; r.push('ترميز متوافق'); }
  else if (it.ext === 'avi') s -= 1;
  if (it.size > 20 * 1048576) { s += 1.5; r.push('مقطع غني'); }
  else if (it.size > 5 * 1048576) s += 0.5;
  if (/loop|background|overlay|transition/i.test(it.name)) { s += 1; r.push('صالح للخلفيات'); }
  return { score: s, reasons: r };
}

export function scoreAudio(it: XCodeItem, isMusic: boolean): Quality {
  const { s: b, r } = base(it);
  let s = b;
  if (['flac', 'wav'].includes(it.ext)) { s += 1; r.push('بلا ضغط'); }
  else if (it.ext === 'mp3') s += 0.5;
  if (isMusic && it.size > 3 * 1048576) { s += 0.8; r.push('مقطع كامل'); }
  if (!isMusic && /logo|reveal|intro|impact|whoosh|riser|transition/i.test(it.name)) { s += 1; r.push('انتقالي'); }
  if (!isMusic && it.size < 300 * 1024 && it.size > 20 * 1024) { s += 0.5; r.push('حجم مثالي للمؤثرات'); }
  return { score: s, reasons: r };
}

export function scoreFont(it: XCodeItem, famCount: number): Quality {
  const { s: b, r } = base(it);
  let s = b;
  if (famCount >= 8) { s += Math.min(2, Math.log10(famCount)); r.push('عائلة مكتملة'); }
  else if (famCount >= 3) s += 0.5;
  if (it.ext === 'woff2') { s += 1; r.push('صيغة ويب حديثة'); }
  else if (it.ext === 'woff') s += 0.5;
  else if (it.ext === 'eot') s -= 1;
  if (/variable/i.test(it.name)) { s += 1; r.push('متغير الأوزان'); }
  if (ARABIC_FAMS.test(it.name + ' ' + it.relPath)) { s += 0.8; r.push('تغطية عربية'); }
  return { score: s, reasons: r };
}

export function scoreIcon(it: XCodeItem, famSize: number): Quality {
  const { s: b, r } = base(it);
  let s = b;
  if (it.ext === 'svg') { s += 1.5; r.push('فيكتور قابل للتحجيم'); }
  else if (['ico', 'webp'].includes(it.ext)) s += 0.3;
  if (famSize >= 500) { s += 1; r.push('عائلة ضخمة متسقة'); }
  else if (famSize >= 50) s += 0.4;
  return { score: s, reasons: r };
}

export function scoreModel(it: XCodeItem): Quality {
  const { s: b, r } = base(it);
  let s = b;
  if (['glb', 'gltf'].includes(it.ext)) { s += 2; r.push('عرض مباشر'); }
  else if (['fbx', 'obj'].includes(it.ext)) { s += 1; r.push('صيغة تبادل'); }
  else if (it.ext === 'blend') { s += 0.5; r.push('ملف Blender أصلي'); }
  if (it.size > 5 * 1048576) { s += 0.8; r.push('تفاصيل غنية'); }
  return { score: s, reasons: r };
}

export function scoreLottie(it: XCodeItem): Quality {
  const { s: b, r } = base(it);
  let s = b;
  if (it.size >= 20 * 1024 && it.size <= 500 * 1024) { s += 1; r.push('تعقيد متوازن'); }
  else if (it.size < 5 * 1024) s -= 0.5;
  else if (it.size > 5 * 1048576) s -= 0.5;
  if (it.ext === 'json') { s += 0.5; r.push('تشغيل فوري'); }
  return { score: s, reasons: r };
}

export function scoreTemplate(it: XCodeItem): Quality {
  const { s: b, r } = base(it);
  let s = b;
  if (/index\.html?$/i.test(it.name)) { s += 0.8; r.push('صفحة رئيسية'); }
  if (it.size > 50 * 1024) { s += 0.5; r.push('محتوى غني'); }
  if (/component|example|demo/i.test(it.relPath)) { s += 0.3; r.push('مكوّن جاهز'); }
  return { score: s, reasons: r };
}

export function scoreLut(it: XCodeItem): Quality {
  const { s: b, r } = base(it);
  let s = b;
  if (/film|cinema|cine/i.test(it.name + it.source)) { s += 0.8; r.push('روح سينمائية'); }
  if (/rec709/i.test(it.name)) { s += 0.5; r.push('معيار بث'); }
  return { score: s, reasons: r };
}

export function scoreArchive(it: XCodeItem): Quality {
  const { s: b, r } = base(it);
  let s = b;
  if (it.size > 10 * 1048576) { s += 1; r.push('حزمة غنية'); }
  if (/part\d+/i.test(it.name)) { s -= 2; r.push('جزء مقسم'); }
  if (/template|pack|bundle|collection/i.test(it.name)) { s += 0.5; r.push('حزمة منظمة'); }
  return { score: s, reasons: r };
}

export function scoreBg(it: XCodeItem): Quality {
  const { s: b, r } = base(it);
  let s = b;
  const tags = it.tags || [];
  if (!tags.includes('اختبار')) { s += 2; r.push('مختارة'); }
  if (tags.includes('pbr')) { s += 1; r.push('PBR احترافية'); }
  if (['تدرج', 'ذهبي', 'رخام', 'جسيمات', 'تجريدي'].some((t) => tags.includes(t))) { s += 0.5; r.push('ثيم مصنف'); }
  if (['psd', 'ai', 'eps'].includes(it.ext)) { s += 0.5; r.push('مصدر قابل للتحرير'); }
  if (it.size > 2 * 1048576) { s += 0.8; r.push('دقة عالية'); }
  return { score: s, reasons: r };
}

// توزيع الفئة على المسجّل المناسب
export function qualityOf(prefix: string, it: XCodeItem, ctx: { famCount?: number; famSize?: number } = {}): Quality {
  switch (prefix) {
    case 'IMG': return scoreImage(it);
    case 'VID': return scoreVideo(it);
    case 'AUD': return scoreAudio(it, true);
    case 'SFX': return scoreAudio(it, false);
    case 'FNT': return scoreFont(it, ctx.famCount || 1);
    case 'ICN': return scoreIcon(it, ctx.famSize || 1);
    case '3D': return scoreModel(it);
    case 'FX': return scoreLottie(it);
    case 'TPL': return scoreTemplate(it);
    case 'LUT': return scoreLut(it);
    case 'ZIP': return scoreArchive(it);
    case 'BG': return scoreBg(it);
    default: {
      const { s, r } = base(it);
      return { score: s, reasons: r };
    }
  }
}
