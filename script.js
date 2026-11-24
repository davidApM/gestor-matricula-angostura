// =========================================================================
// 0. CONFIGURACIÓN DE GOOGLE SHEETS Y SEGURIDAD CON PIN
// =========================================================================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzsjn88k8dcbqUqOTQad4d_A_V2U4xYdqxKJx930JUki7Og6JMYYiteNsc-0cqxwL0b/exec";


let ACCESS_PIN = "";
let studentsDB = [];
let currentStudentIndex = -1;
let rawImportedHeaders = [];
let rawImportedRows = [];

window.addEventListener('DOMContentLoaded', () => {
    setupAutoGenderListener();

    // Verificar si ya ingresó el PIN en esta sesión
    const savedPin = sessionStorage.getItem('matricula_access_pin');
    if (savedPin) {
        ACCESS_PIN = savedPin;
        unlockSystemAndLoad();
    } else {
        setTimeout(() => document.getElementById('pinLoginInput')?.focus(), 100);
    }
});

async function verifyPinAccess() {
    const input = document.getElementById('pinLoginInput');
    const errorMsg = document.getElementById('pinErrorMsg');
    const pinValue = input.value.trim();

    if (!pinValue) {
        errorMsg.textContent = 'Por favor, ingresa el PIN.';
        errorMsg.classList.remove('hidden');
        return;
    }

    errorMsg.classList.add('hidden');
    ACCESS_PIN = pinValue;

    const ok = await loadFromGoogleSheets(true);
    if (ok) {
        sessionStorage.setItem('matricula_access_pin', ACCESS_PIN);
        document.getElementById('pinLockOverlay')?.classList.add('hidden');
    } else {
        ACCESS_PIN = "";
        errorMsg.textContent = 'PIN incorrecto o sin conexión a Google Sheets.';
        errorMsg.classList.remove('hidden');
        input.select();
    }
}

function unlockSystemAndLoad() {
    document.getElementById('pinLockOverlay')?.classList.add('hidden');
    loadFromGoogleSheets(false);
}

async function loadFromGoogleSheets(isLoginAttempt = false) {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('TU_URL_DE_IMPLEMENTACION')) {
        showToast('⚠️ Falta configurar GOOGLE_SCRIPT_URL en script.js', 'warning');
        return true;
    }

    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?pin=${encodeURIComponent(ACCESS_PIN)}`);
        const result = await response.json();

        if (result.status !== 'success') {
            if (!isLoginAttempt) {
                sessionStorage.removeItem('matricula_access_pin');
                document.getElementById('pinLockOverlay')?.classList.remove('hidden');
            }
            return false;
        }

        const rows = result.data || [];
        if (rows.length > 1) {
            const headers = rows[0].map(h => normalizeText(h));
            const keyMap = headers.map(h => {
                const found = FIELD_DEFINITIONS.find(f =>
                    normalizeText(f.label) === h || f.aliases.some(al => normalizeText(al) === h)
                );
                return found ? found.key : null;
            });

            studentsDB = rows.slice(1)
                .filter(r => r.some(cell => String(cell).trim() !== ''))
                .map(r => {
                    const obj = {};
                    FIELD_DEFINITIONS.forEach(f => obj[f.key] = '');
                    r.forEach((cell, idx) => {
                        if (keyMap[idx]) obj[keyMap[idx]] = String(cell).trim();
                    });
                    // Solo promover si NO repite grado y si aún no tiene el formato final de matrícula 2027 (con comillas "A" o Parvularia ya promovida)
                    const isRepite = normalizeYesNo(obj.repite_grado) === 'SÍ';
                    const alreadyFormatted = obj.grado && (obj.grado.includes('"') || obj.grado === 'Parvularia 5' || obj.grado === 'Parvularia 6');
                    if (obj.grado && !isRepite && !alreadyFormatted) {
                        obj.grado = promoteGradeFor2027(obj.grado);
                    }
                    if (!obj.genero && obj.primer_nombre) obj.genero = inferGenderFromName(obj.primer_nombre);
                    if (!obj.correo_clases && obj.nie) obj.correo_clases = `${obj.nie}@clases.edu.sv`;
                    return obj;
                });
        } else {
            studentsDB = [];
        }

        updateGradeFilters();
        renderStudentsList();
        if (studentsDB.length > 0) {
            selectStudent(0);
        } else {
            createNewStudent();
        }
        showToast(`Base sincronizada (${studentsDB.length} estudiantes).`, 'success');
        return true;
    } catch (err) {
        console.error('Error cargando Google Sheets:', err);
        if (!isLoginAttempt) showToast('Error al conectar con Google Sheets.', 'error');
        return false;
    }
}

async function syncToGoogleSheets() {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('TU_URL_DE_IMPLEMENTACION') || !ACCESS_PIN) return;

    try {
        const headers = FIELD_DEFINITIONS.map(f => f.label);
        const rows = studentsDB.map(st => FIELD_DEFINITIONS.map(f => st[f.key] || ''));

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ pin: ACCESS_PIN, headers, rows })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showToast('☁️ Guardado en Google Sheets.', 'success');
        } else {
            showToast('No se pudo sincronizar con Google Sheets.', 'error');
        }
    } catch (err) {
        console.error('Error guardando en Google Sheets:', err);
        showToast('Error de red al guardar en la nube.', 'error');
    }
}

function getActiveFormContainer() {
    return activeFormTemplate === 'infancia'
        ? document.getElementById('fichaPrimeraInfanciaWrapper')
        : document.getElementById('fichaFormSheet');
}

function toggleYesNoField(el) {
    const current = el.textContent.trim().toUpperCase();
    let nextVal = '';
    if (current === '') nextVal = 'SÍ';
    else if (current === 'SÍ') nextVal = 'NO';
    else nextVal = '';
    el.textContent = nextVal;

    // Si marcan o desmarcan "Repite grado", ajustar automáticamente el grado en la ficha
    if (el.getAttribute('data-field') === 'repite_grado') {
        const container = el.closest('#fichaFormSheet, #fichaPrimeraInfanciaWrapper') || document;
        const gradoInput = container.querySelector('input[data-field="grado"]');
        if (gradoInput && gradoInput.value.trim()) {
            if (nextVal === 'SÍ' && current !== 'SÍ') {
                gradoInput.value = demoteGradeOneLevel(gradoInput.value);
                el.dataset.wasDemoted = 'true';
                showToast(`Grado ajustado a ${gradoInput.value} por repitencia.`, 'info');
            } else if (nextVal !== 'SÍ' && el.dataset.wasDemoted === 'true') {
                gradoInput.value = promoteGradeFor2027(gradoInput.value);
                delete el.dataset.wasDemoted;
                showToast(`Grado restaurado a ${gradoInput.value}.`, 'info');
            }
        }
    }
}

function toggleXBox(el) {
    el.textContent = el.textContent.trim() === 'X' ? '' : 'X';
}

function selectRadioBox(el) {
    const group = el.getAttribute('data-group');
    const container = el.closest('#fichaFormSheet, #fichaPrimeraInfanciaWrapper') || document;
    const isAlreadyMarked = el.textContent.trim() === 'X';
    container.querySelectorAll(`.ficha-check-box[data-group="${group}"]`).forEach(box => {
        box.textContent = '';
    });
    if (!isAlreadyMarked) {
        el.textContent = 'X';
    }
}

function setRadioGroupValue(container, groupName, value) {
    const norm = normalizeYesNo(value);
    const boxes = container.querySelectorAll(`.ficha-check-box[data-group="${groupName}"]`);
    boxes.forEach(box => {
        box.textContent = (box.getAttribute('data-val') === norm) ? 'X' : '';
    });
}

function getRadioGroupValue(container, groupName) {
    const boxes = container.querySelectorAll(`.ficha-check-box[data-group="${groupName}"]`);
    for (const box of boxes) {
        if (box.textContent.trim() === 'X') {
            return box.getAttribute('data-val');
        }
    }
    return '';
}

function normalizeYesNo(val) {
    if (val === null || val === undefined) return '';
    const str = String(val).trim().toUpperCase();
    if (['SI', 'SÍ', 'S', 'YES', 'X', '1', 'TRUE'].includes(str)) return 'SÍ';
    if (['NO', 'N', '0', 'FALSE'].includes(str)) return 'NO';
    return str;
}