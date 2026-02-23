
export const AppServientregaUri = "https://apps.servientrega.com/SismilenioNET/Ingreso.aspx";

export function similarity(a, b) {
  // Normalizar: quitar espacios y convertir a minúsculas
  a = a.replace(/\s+/g, '').toLowerCase();
  b = b.replace(/\s+/g, '').toLowerCase();

  const matrix = [];

  const lenA = a.length;
  const lenB = b.length;

  if (lenA === 0) return lenB === 0 ? 100 : 0;
  if (lenB === 0) return 0;

  // Crear matriz
  for (let i = 0; i <= lenB; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= lenA; j++) {
    matrix[0][j] = j;
  }

  // Calcular distancia
  for (let i = 1; i <= lenB; i++) {
    for (let j = 1; j <= lenA; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // sustitución
          matrix[i][j - 1] + 1,     // inserción
          matrix[i - 1][j] + 1      // eliminación
        );
      }
    }
  }

  const distance = matrix[lenB][lenA];
  const maxLen = Math.max(lenA, lenB);

  const similarityPercentage = ((maxLen - distance) / maxLen) * 100;

  return Number(similarityPercentage.toFixed(2));
}


function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // tildes
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreMatch(optionWord, questionText) {
  const w = norm(optionWord);
  const q = norm(questionText);

  if (!w || !q) return 0;

  // 1) match exacto (raro pero perfecto)
  if (w === q) return 100;

  // 2) match como palabra completa dentro del texto
  //    (logo debe ganar en "logo de servientrega")
  const wordRe = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  if (wordRe.test(q)) return 100;

  // 3) match por "contiene" (por si viene pegado o sin espacios)
  const qNoSpaces = q.replace(/\s+/g, "");
  const wNoSpaces = w.replace(/\s+/g, "");
  if (qNoSpaces.includes(wNoSpaces)) return 95;

  // 4) prefijo izquierda->derecha (fallback)
  let matches = 0;
  const minLen = Math.min(wNoSpaces.length, qNoSpaces.length);
  for (let i = 0; i < minLen; i++) {
    if (wNoSpaces[i] === qNoSpaces[i]) matches++;
    else break;
  }
  const left = (matches / Math.max(wNoSpaces.length, qNoSpaces.length)) * 100;

  // 5) fallback suave
  return Math.max(left, 0);
}

export function leftSimilarity(a, b) {
  a = a.toLowerCase().replace(/\s+/g, '');
  b = b.toLowerCase().replace(/\s+/g, '');

  const minLen = Math.min(a.length, b.length);
  let matches = 0;

  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) {
      matches++;
    } else {
      break; // se detiene cuando deja de coincidir
    }
  }

  return (matches / Math.max(a.length, b.length)) * 100;
}




function leftPrefixSimilarity(a, b) {
  const minLen = Math.min(a.length, b.length);
  let matches = 0;
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) matches++;
    else break;
  }
  return (matches / Math.max(a.length, b.length)) * 100;
}

export function bestOptionByGrowingPrefixes(options, cleanedQuestionText, { minPrefix = 2 } = {}) {
  const target = norm(cleanedQuestionText);
  if (!target) return { best: null, scored: [] };

  // prefijos: [0,2], [0,3], ... [0,target.length]
  const prefixes = [];
  for (let len = Math.max(minPrefix, 1); len <= target.length; len++) {
    prefixes.push(target.slice(0, len));
  }

  const scored = options.map(op => {
    const w = norm(op.img_name);

    let bestScore = 0;
    let matchedPrefix = "";

    for (const p of prefixes) {
      let score = 0;

      if (!w) score = 0;
      else if (w === target) score = 100;
      else if (w.startsWith(p) || p.startsWith(w)) score = 95; // match fuerte por prefijo
      else score = leftPrefixSimilarity(w, p); // fallback

      if (score > bestScore) {
        bestScore = score;
        matchedPrefix = p;
        if (bestScore >= 95) break; // suficiente
      }
    }

    return { ...op, score: Number(bestScore.toFixed(2)), matchedPrefix };
  });

  scored.sort((a, b) => b.score - a.score);
  return { best: scored[0], scored };
}