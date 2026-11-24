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
                    if (obj.grado) obj.grado = promoteGradeFor2027(obj.grado);
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
    if (current === '') el.textContent = 'SÍ';
    else if (current === 'SÍ') el.textContent = 'NO';
    else el.textContent = '';
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

// =========================================================================
// 1. DEFINICIÓN DE CAMPOS OFICIALES Y SINÓNIMOS PARA MAPEO INTELIGENTE
// =========================================================================
const FIELD_DEFINITIONS = [
  const rawData = studentData || {};
let extraPI = {};
if (rawData.datos_primera_infancia_json) {
    try { extraPI = JSON.parse(rawData.datos_primera_infancia_json); } catch (e) { }
}
const data = { ...extraPI, ...rawData };

sheetElement.querySelectorAll('input[data-field]').forEach(input => {
    const key = input.getAttribute('data-field');
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        input.value = String(data[key]);
    } else if (!input.defaultValue) {
        input.value = '';
    }
});

sheetElement.querySelectorAll('.ficha-check-box[data-field]').forEach(box => {
    const key = box.getAttribute('data-field');
    if (key.startsWith('pi_')) {
        box.textContent = data[key] === 'X' ? 'X' : '';
    } else {
        box.textContent = normalizeYesNo(data[key]);
    }
});

const allRadioGroups = new Set();
sheetElement.querySelectorAll('.ficha-check-box[data-group]').forEach(box => {
    allRadioGroups.add(box.getAttribute('data-group'));
});
allRadioGroups.forEach(group => {
    setRadioGroupValue(sheetElement, group, data[group]);
});
}

function extractDataFromSheetForm(sheetElement) {
    const existingRecord = (currentStudentIndex >= 0 && studentsDB[currentStudentIndex])
        ? { ...studentsDB[currentStudentIndex] }
        : {};
    const record = { ...existingRecord };
    let extraPI = {};
    if (record.datos_primera_infancia_json) {
        try { extraPI = JSON.parse(record.datos_primera_infancia_json); } catch (e) { }
    }

    sheetElement.querySelectorAll('input[data-field]').forEach(input => {
        const key = input.getAttribute('data-field');
        const val = input.value.trim();
        if (key.startsWith('pi_')) {
            extraPI[key] = val;
        } else {
            record[key] = val;
        }
    });

    sheetElement.querySelectorAll('.ficha-check-box[data-field]').forEach(box => {
        const key = box.getAttribute('data-field');
        const val = box.textContent.trim();
        if (key.startsWith('pi_')) {
            extraPI[key] = val;
        } else {
            record[key] = val;
        }
    });

    const allRadioGroups = new Set();
    sheetElement.querySelectorAll('.ficha-check-box[data-group]').forEach(box => {
        allRadioGroups.add(box.getAttribute('data-group'));
    });
    allRadioGroups.forEach(group => {
        const val = getRadioGroupValue(sheetElement, group);
        if (group.startsWith('pi_')) {
            extraPI[group] = val;
        } else {
            record[group] = val;
        }
    });

    record.datos_primera_infancia_json = JSON.stringify(extraPI);
    return record;
}

function autoFillCompromiso() {
    const sheet = getActiveFormContainer();
    const data = extractDataFromSheetForm(sheet);

    let fullName = '';
    if (data.rep_nombres || data.rep_primer_apellido) {
        fullName = `${data.rep_nombres} ${data.rep_primer_apellido} ${data.rep_segundo_apellido}`.replace(/\s+/g, ' ').trim();
    } else if (data.madre_nombres || data.madre_primer_apellido) {
        fullName = `${data.madre_nombres} ${data.madre_primer_apellido} ${data.madre_segundo_apellido}`.replace(/\s+/g, ' ').trim();
    } else if (data.padre_nombres || data.padre_primer_apellido) {
        fullName = `${data.padre_nombres} ${data.padre_primer_apellido} ${data.padre_segundo_apellido}`.replace(/\s+/g, ' ').trim();
    }

    if (!fullName) {
        showToast('Ingresa primero los nombres del Representante, Madre o Padre.', 'warning');
        return;
    }

    const compInput = sheet.querySelector('input[data-field="compromiso_nombre"]');
    const firmaInput = sheet.querySelector('input[data-field="encargado_firma_nombre"]');
    if (compInput) compInput.value = fullName.toUpperCase();
    if (firmaInput) firmaInput.value = fullName.toUpperCase();
    showToast('Nombre del encargado completado en el compromiso y firma.', 'success');
}

// =========================================================================
// 6. CRUD EN MEMORIA, HERRAMIENTA DOCENTE Y LISTA LATERAL DE ESTUDIANTES
// =========================================================================
function renderStudentsList() {
    const container = document.getElementById('studentsListContainer');
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const gradeFilter = document.getElementById('gradeFilterSelect').value;

    document.getElementById('studentCountBadge').textContent = studentsDB.length;
    document.getElementById('clearSearchBtn').classList.toggle('hidden', searchTerm.length === 0);

    const filtered = studentsDB
        .map((st, idx) => ({ st, idx }))
        .filter(({ st }) => {
            if (gradeFilter && (st.grado || '') !== gradeFilter) return false;
            if (!searchTerm) return true;
            const haystack = `${st.nie || ''} ${st.primer_nombre || ''} ${st.segundo_nombre || ''} ${st.primer_apellido || ''} ${st.segundo_apellido || ''}`.toLowerCase();
            return haystack.includes(searchTerm);
        });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-xs text-slate-500">No se encontraron estudiantes con ese criterio.</div>`;
        return;
    }

    container.innerHTML = filtered.map(({ st, idx }) => {
        const isSelected = idx === currentStudentIndex;
        const fullName = `${st.primer_apellido || ''} ${st.segundo_apellido || ''}, ${st.primer_nombre || ''} ${st.segundo_nombre || ''}`.replace(/\s+/g, ' ').trim() || '(Sin nombre)';
        return `
      <div onclick="selectStudent(${idx})" class="p-2.5 cursor-pointer transition flex items-center justify-between gap-2 ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-slate-800'}">
        <div class="min-w-0 flex-1">
          <div class="text-xs font-bold truncate">${escapeHTML(fullName)}</div>
          <div class="text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-500'} flex items-center gap-2 mt-0.5">
            <span><i class="fa-solid fa-id-card mr-1"></i>NIE: ${escapeHTML(st.nie || 'N/A')}</span>
            <span>•</span>
            <span class="truncate">${escapeHTML(st.grado || 'Sin grado')}</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right text-xs ${isSelected ? 'text-white' : 'text-slate-300'}"></i>
      </div>
    `;
    }).join('');
}

function filterStudentsList() {
    renderStudentsList();
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    renderStudentsList();
}

function selectStudent(index) {
    currentStudentIndex = index;
    const student = studentsDB[index];

    // Cambiar automáticamente al formato de Primera Infancia si es Parvularia 4, 5, 6 o 1° Grado
    const useInfancia = isPrimeraInfanciaGrade(student.grado);
    switchFormTemplate(useInfancia ? 'infancia' : 'general');

    populateSheetForm(getActiveFormContainer(), student);
    renderStudentsList();

    document.getElementById('editingStatusBadge').textContent = `Editando: NIE ${student.nie || 'S/N'}`;
    document.getElementById('editingStatusBadge').className = 'bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full';
    document.getElementById('saveBtnLabel').textContent = 'Guardar Cambios en BD';
    document.getElementById('deleteStudentBtn').classList.remove('hidden');
}

function createNewStudent() {
    currentStudentIndex = -1;
    const bulkTeacherEl = document.getElementById('bulkTeacherName');
    const bulkGradeEl = document.getElementById('bulkGradeSelect');
    const defaultTeacher = bulkTeacherEl ? bulkTeacherEl.value.trim() : '';
    const defaultGrade = bulkGradeEl ? bulkGradeEl.value.trim() : '';

    if (defaultGrade) {
        switchFormTemplate(isPrimeraInfanciaGrade(defaultGrade) ? 'infancia' : 'general');
    }

    populateSheetForm(getActiveFormContainer(), {
        docente_nombre: defaultTeacher,
        grado: defaultGrade
    });
    renderStudentsList();

    document.getElementById('editingStatusBadge').textContent = 'Modo: Nuevo Registro';
    document.getElementById('editingStatusBadge').className = 'bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full';
    document.getElementById('saveBtnLabel').textContent = 'Agregar Estudiante a BD';
    document.getElementById('deleteStudentBtn').classList.add('hidden');
    showToast('Formulario limpio listo para nuevo estudiante.', 'info');
}

function saveCurrentStudentToDB() {
    const sheet = getActiveFormContainer();
    const record = extractDataFromSheetForm(sheet);

    if (!record.primer_nombre && !record.primer_apellido && !record.nie) {
        showToast('Ingresa al menos el NIE o el nombre del estudiante antes de guardar.', 'error');
        return;
    }

    if (currentStudentIndex === -1) {
        studentsDB.unshift(record);
        currentStudentIndex = 0;
        showToast('Nuevo estudiante agregado localmente.', 'success');
    } else {
        studentsDB[currentStudentIndex] = record;
        showToast('Cambios guardados localmente.', 'success');
    }

    updateGradeFilters();
    selectStudent(currentStudentIndex);
    syncToGoogleSheets(); // Guarda automáticamente en la nube
}

function deleteCurrentStudent() {
    if (currentStudentIndex < 0 || currentStudentIndex >= studentsDB.length) return;
    const removed = studentsDB.splice(currentStudentIndex, 1);
    updateGradeFilters();
    if (studentsDB.length > 0) {
        selectStudent(Math.min(currentStudentIndex, studentsDB.length - 1));
    } else {
        createNewStudent();
    }
    showToast(`Registro eliminado (${removed[0].primer_nombre || 'Estudiante'}).`, 'info');
    syncToGoogleSheets(); // Actualiza la nube al eliminar
}

function updateGradeFilters() {
    const grades = [...new Set(studentsDB.map(s => (s.grado || '').trim()).filter(Boolean))].sort();
    const mainSelect = document.getElementById('gradeFilterSelect');
    const batchSelect = document.getElementById('batchGradeSelect');
    const bulkDatalist = document.getElementById('bulkGradeDatalist');

    const prevMain = mainSelect.value;
    mainSelect.innerHTML = '<option value="">Todos los grados cargados</option>' +
        grades.map(g => `<option value="${escapeHTML(g)}">${escapeHTML(g)}</option>`).join('');
    if (grades.includes(prevMain)) mainSelect.value = prevMain;

    if (bulkDatalist) {
        bulkDatalist.innerHTML = grades.map(g => `<option value="${escapeHTML(g)}">`).join('');
    }

    batchSelect.innerHTML = `<option value="ALL">Todos los estudiantes (${studentsDB.length})</option>` +
        grades.map(g => {
            const count = studentsDB.filter(s => (s.grado || '').trim() === g).length;
            return `<option value="${escapeHTML(g)}">${escapeHTML(g)} (${count} estudiantes)</option>`;
        }).join('');
}

function applyBulkTeacherData() {
    const bulkGradeEl = document.getElementById('bulkGradeSelect');
    const bulkTeacherEl = document.getElementById('bulkTeacherName');
    if (!bulkGradeEl || !bulkTeacherEl) return;

    const selectedGrade = bulkGradeEl.value.trim();
    const teacherName = bulkTeacherEl.value.trim();
    const defVacunas = document.getElementById('bulkDefaultVacunas')?.checked || false;
    const defFoto = document.getElementById('bulkDefaultFoto')?.checked || false;
    const defExtranjero = document.getElementById('bulkDefaultExtranjero')?.checked || false;
    const defRepite = document.getElementById('bulkDefaultRepite')?.checked || false;

    if (!selectedGrade) {
        showToast('Por favor, elige o escribe primero el grado al que aplicarás los datos.', 'warning');
        return;
    }

    if (!teacherName && !defVacunas && !defFoto && !defExtranjero && !defRepite) {
        showToast('Escribe el nombre del docente o marca al menos una opción por defecto.', 'warning');
        return;
    }

    let updatedCount = 0;
    studentsDB.forEach(student => {
        if ((student.grado || '').trim() === selectedGrade) {
            if (teacherName) student.docente_nombre = teacherName;
            if (defVacunas) student.vacunas_completas = 'SÍ';
            if (defFoto) student.autoriza_foto = 'SÍ';
            if (defExtranjero) student.extranjero = 'NO';
            if (defRepite) student.repite_grado = 'NO';
            updatedCount++;
        }
    });

    if (updatedCount === 0) {
        showToast('No hay alumnos registrados en ese grado aún. Si creas un alumno nuevo, ya tomará este grado y docente.', 'info');
        return;
    }

    if (currentStudentIndex >= 0 && (studentsDB[currentStudentIndex].grado || '').trim() === selectedGrade) {
        populateSheetForm(document.getElementById('fichaFormSheet'), studentsDB[currentStudentIndex]);
    }

    syncToGoogleSheets();
    showToast(`¡Listo! Datos aplicados a ${updatedCount} estudiantes de ${selectedGrade}.`, 'success');
}

// =========================================================================
// 7. IMPORTACIÓN Y EXPORTACIÓN EXCEL (.XLSX / .CSV) CON SHEETJS
// =========================================================================
function downloadTemplateExcel() {
    const headers = FIELD_DEFINITIONS.map(f => f.label);
    const rows = SAMPLE_STUDENTS.map(st => {
        return FIELD_DEFINITIONS.map(f => st[f.key] || '');
    });

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 16) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matricula_2027');
    XLSX.writeFile(wb, 'Plantilla_Matricula_2027_La_Angostura.xlsx');
    showToast('Plantilla Excel descargada correctamente.', 'success');
}

function exportUpdatedExcel() {
    if (studentsDB.length === 0) {
        showToast('No hay estudiantes en la base de datos para exportar.', 'warning');
        return;
    }

    const headers = FIELD_DEFINITIONS.map(f => f.label);
    const rows = studentsDB.map(st => {
        return FIELD_DEFINITIONS.map(f => st[f.key] || '');
    });

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 16) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BD_Matricula_2027');

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `BD_Matricula_2027_Actualizada_${today}.xlsx`);
    showToast(`Base de datos exportada (${studentsDB.length} registros).`, 'success');
}

function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const jsonMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            if (jsonMatrix.length < 2) {
                showToast('El archivo Excel está vacío o no contiene filas de datos.', 'error');
                return;
            }

            rawImportedHeaders = jsonMatrix[0].map(h => String(h).trim());
            rawImportedRows = jsonMatrix.slice(1).filter(row => row.some(cell => String(cell).trim() !== ''));

            openMappingModal();
        } catch (err) {
            console.error(err);
            showToast('Error al leer el archivo. Asegúrate de que sea un .xlsx, .xls o .csv válido.', 'error');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

function normalizeText(str) {
    return String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function openMappingModal() {
    document.getElementById('detectedRowsCount').textContent = rawImportedRows.length;
    const grid = document.getElementById('mappingFieldsGrid');

    const normalizedHeaders = rawImportedHeaders.map(h => normalizeText(h));

    grid.innerHTML = FIELD_DEFINITIONS.map(field => {
        let matchedIndex = -1;
        const normLabel = normalizeText(field.label);

        matchedIndex = normalizedHeaders.findIndex(nh =>
            nh === normLabel || field.aliases.some(al => normalizeText(al) === nh)
        );

        if (matchedIndex === -1) {
            matchedIndex = normalizedHeaders.findIndex(nh =>
                nh.length > 2 && (normLabel.includes(nh) || field.aliases.some(al => nh.includes(normalizeText(al))))
            );
        }

        const optionsHTML = `<option value="-1">-- Ignorar / Dejar en blanco --</option>` +
            rawImportedHeaders.map((h, idx) =>
                `<option value="${idx}" ${idx === matchedIndex ? 'selected' : ''}>${escapeHTML(h || `Columna ${idx + 1}`)}</option>`
            ).join('');

        return `
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col gap-1">
        <label class="font-semibold text-slate-700">${escapeHTML(field.label)}</label>
        <select data-map-key="${field.key}" class="border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-800 outline-none focus:border-blue-500">
          ${optionsHTML}
        </select>
      </div>
    `;
    }).join('');

    const modal = document.getElementById('mappingModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeMappingModal() {
    const modal = document.getElementById('mappingModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function confirmExcelMapping() {
    const selects = document.querySelectorAll('#mappingFieldsGrid select[data-map-key]');
    const mapping = {};
    selects.forEach(sel => {
        mapping[sel.getAttribute('data-map-key')] = parseInt(sel.value, 10);
    });

    const importedStudents = rawImportedRows.map(row => {
        const studentObj = {};
        FIELD_DEFINITIONS.forEach(field => {
            const colIdx = mapping[field.key];
            if (colIdx >= 0 && row[colIdx] !== undefined && row[colIdx] !== null) {
                studentObj[field.key] = String(row[colIdx]).trim();
            } else {
                studentObj[field.key] = '';
            }
        });
        return studentObj;
    });

    studentsDB = importedStudents;
    closeMappingModal();
    updateGradeFilters();
    renderStudentsList();

    if (studentsDB.length > 0) {
        selectStudent(0);
    } else {
        createNewStudent();
    }

    syncToGoogleSheets();
    showToast(`¡Éxito! Se cargaron ${studentsDB.length} estudiantes desde tu Excel.`, 'success');
}

// =========================================================================
// 8. IMPRESIÓN INDIVIDUAL Y POR LOTE (CARTA 1 PÁGINA POR ESTUDIANTE)
// =========================================================================
function printSingleSheet() {
    document.body.classList.remove('printing-batch');
    window.print();
}

function openBatchModal() {
    if (studentsDB.length === 0) {
        showToast('No hay estudiantes cargados para imprimir en lote.', 'warning');
        return;
    }
    updateGradeFilters();
    updateBatchCountPreview();
    const modal = document.getElementById('batchModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeBatchModal() {
    const modal = document.getElementById('batchModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function getBatchFilteredStudents() {
    const selectedGrade = document.getElementById('batchGradeSelect').value;
    if (selectedGrade === 'ALL') return studentsDB;
    return studentsDB.filter(s => (s.grado || '').trim() === selectedGrade);
}

function updateBatchCountPreview() {
    const list = getBatchFilteredStudents();
    document.getElementById('batchCountNumber').textContent = list.length;
}

function executeBatchPrint() {
    const list = getBatchFilteredStudents();
    if (list.length === 0) {
        showToast('No hay estudiantes en el filtro seleccionado.', 'warning');
        return;
    }

    const batchContainer = document.getElementById('batchPrintContainer');
    batchContainer.innerHTML = '';

    const generalTemplate = document.getElementById('fichaFormSheet');
    const infanciaTemplate = document.getElementById('fichaPrimeraInfanciaWrapper');

    list.forEach(student => {
        if (isPrimeraInfanciaGrade(student.grado)) {
            const cloneInfancia = infanciaTemplate.cloneNode(true);
            cloneInfancia.removeAttribute('id');
            cloneInfancia.classList.remove('hidden', 'space-y-6');
            populateSheetForm(cloneInfancia, student);
            cloneInfancia.querySelectorAll('.pi-page').forEach(page => {
                batchContainer.appendChild(page);
            });
        } else {
            const cloneGeneral = generalTemplate.cloneNode(true);
            cloneGeneral.removeAttribute('id');
            cloneGeneral.classList.remove('hidden');
            populateSheetForm(cloneGeneral, student);
            batchContainer.appendChild(cloneGeneral);
        }
    });

    closeBatchModal();
    document.body.classList.add('printing-batch');

    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove('printing-batch');
            batchContainer.innerHTML = '';
        }, 500);
    }, 150);
}

// =========================================================================
// 9. UTILIDADES DE INTERFAZ (TOASTS Y SEGURIDAD HTML)
// =========================================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');

    const colors = {
        success: 'bg-emerald-600 text-white',
        error: 'bg-red-600 text-white',
        warning: 'bg-amber-500 text-slate-950 font-semibold',
        info: 'bg-slate-800 text-white'
    };

    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-exclamation',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    toast.className = `${colors[type] || colors.info} px-4 py-3 rounded-xl shadow-lg text-xs flex items-center gap-2.5 transition-all duration-300 transform translate-y-2 opacity-0`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info} text-sm"></i><span>${escapeHTML(message)}</span>`;

    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function escapeHTML(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function toggleAdminExcelTools() {
    const group = document.getElementById('adminExcelToolsGroup');
    const btn = document.getElementById('unlockAdminExcelBtn');
    if (!group || !btn) return;

    // Si ya están visibles, volver a bloquearlos
    if (!group.classList.contains('hidden')) {
        group.classList.add('hidden');
        group.classList.remove('flex');
        btn.innerHTML = '<i class="fa-solid fa-key text-amber-400"></i><span>Admin Excel</span>';
        showToast('Herramientas de Excel bloqueadas.', 'info');
        return;
    }

    // Crear modal rápido para pedir clave de administrador sin usar prompt()
    let modal = document.getElementById('adminExcelModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'adminExcelModal';
        modal.className = 'no-print fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-5 text-center space-y-3">
        <div class="w-11 h-11 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-lg">
          <i class="fa-solid fa-shield-halved"></i>
        </div>
        <h3 class="font-bold text-slate-900 text-sm">Desbloquear Excel (Admin)</h3>
        <p class="text-[11px] text-slate-500">Ingresa la clave de administración para importar o exportar la base de datos.</p>
        <input type="password" id="adminExcelPinInput" placeholder="Clave Admin" class="w-full text-center font-bold border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600" />
        <div class="flex gap-2 pt-1">
          <button id="cancelAdminExcelBtn" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 rounded-lg cursor-pointer">Cancelar</button>
          <button id="confirmAdminExcelBtn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg cursor-pointer">Desbloquear</button>
        </div>
      </div>
    `;
        document.body.appendChild(modal);

        document.getElementById('cancelAdminExcelBtn').onclick = () => modal.classList.add('hidden');
        const validateAdmin = () => {
            const val = document.getElementById('adminExcelPinInput').value.trim();
            // Clave exclusiva para desbloquear herramientas de Excel
            if (val === '10844ADMIN') {
                modal.classList.add('hidden');
                document.getElementById('adminExcelPinInput').value = '';
                group.classList.remove('hidden');
                group.classList.add('flex');
                btn.innerHTML = '<i class="fa-solid fa-lock text-emerald-400"></i><span>Bloquear Excel</span>';
                showToast('Herramientas de Excel desbloqueadas.', 'success');
            } else {
                showToast('Clave de administración incorrecta.', 'error');
            }
        };
        document.getElementById('confirmAdminExcelBtn').onclick = validateAdmin;
        document.getElementById('adminExcelPinInput').onkeydown = (e) => {
            if (e.key === 'Enter') validateAdmin();
        };
    } else {
        modal.classList.remove('hidden');
    }
    setTimeout(() => document.getElementById('adminExcelPinInput')?.focus(), 50);
}

function inferGenderFromName(firstName) {
    const name = normalizeText(firstName).split(/\s+/)[0];
    if (!name) return '';

    const femaleExceptions = [
        'ashly', 'ashley', 'emily', 'emely', 'genesis', 'heidi', 'estefany', 'stephanie',
        'marisol', 'kelly', 'bridget', 'heymi', 'heyny', 'madison', 'yenixa', 'glendy',
        'mayelin', 'jennifer', 'joseline', 'joselyn', 'lisseth', 'liseth', 'abigail',
        'ruth', 'ester', 'esther', 'raquel', 'noemi', 'nohemy', 'beatriz', 'luz', 'flor',
        'rocio', 'carmen', 'mercedes', 'pilar', 'soledad', 'dolores', 'amparo', 'consuelo',
        'belen', 'aracely', 'wendy', 'cindy', 'karen', 'sharon', 'nicole', 'michelle',
        'denisse', 'denise', 'iris', 'ingrid', 'astrid', 'edith', 'judith', 'miriam', 'yessica'
    ];

    const maleExceptions = [
        'josue', 'jose', 'noe', 'noel', 'betuel', 'jonathan', 'anderson', 'william',
        'brandon', 'brayden', 'johan', 'jeremy', 'kennedy', 'ulises', 'eduardo', 'victor',
        'joel', 'javier', 'steven', 'melvin', 'rodrigo', 'anthony', 'nelson', 'alcides',
        'gustavo', 'dayron', 'diego', 'junior', 'alexander', 'snider', 'guillermo',
        'joshua', 'borja', 'luca', 'ezra', 'isaac', 'israel', 'daniel', 'david', 'carlos'
    ];

    if (femaleExceptions.includes(name)) return 'F';
    if (maleExceptions.includes(name)) return 'M';
    if (name.endsWith('a')) return 'F';
    return 'M';
}

function setupAutoGenderListener() {
    const sheet = document.getElementById('fichaFormSheet');
    if (!sheet) return;
    const firstNameInput = sheet.querySelector('input[data-field="primer_nombre"]');
    const genderInput = sheet.querySelector('input[data-field="genero"]');
    if (firstNameInput && genderInput) {
        firstNameInput.addEventListener('blur', () => {
            if (!genderInput.value.trim() && firstNameInput.value.trim()) {
                genderInput.value = inferGenderFromName(firstNameInput.value);
            }
        });
    }

    // Autocompletar correo NIE@clases.edu.sv al escribir el NIE
    const nieInput = sheet.querySelector('input[data-field="nie"]');
    const emailInput = sheet.querySelector('input[data-field="correo_clases"]');
    if (nieInput && emailInput) {
        nieInput.addEventListener('input', () => {
            const cleanNie = nieInput.value.trim();
            if (cleanNie && (!emailInput.value.trim() || emailInput.value.endsWith('@clases.edu.sv'))) {
                emailInput.value = `${cleanNie}@clases.edu.sv`;
            } else if (!cleanNie && emailInput.value.endsWith('@clases.edu.sv')) {
                emailInput.value = '';
            }
        });
    }
}

function openBirthDatePicker() {
    const picker = document.getElementById('fechaNacimientoPicker');
    const textInput = document.getElementById('fechaNacimientoText');
    if (!picker) return;

    // Sincronizar fecha actual DD/MM/AAAA hacia YYYY-MM-DD antes de abrir el calendario
    if (textInput && /^\d{2}\/\d{2}\/\d{4}$/.test(textInput.value.trim())) {
        const [dd, mm, yyyy] = textInput.value.trim().split('/');
        picker.value = `${yyyy}-${mm}-${dd}`;
    }

    if (typeof picker.showPicker === 'function') {
        picker.showPicker();
    } else {
        picker.click();
    }
}

function syncBirthDateFromPicker(picker) {
    const textInput = document.getElementById('fechaNacimientoText');
    if (!textInput || !picker.value) return;
    const [yyyy, mm, dd] = picker.value.split('-');
    textInput.value = `${dd}/${mm}/${yyyy}`;
}

function formatBirthDateInput(input) {
    let digits = input.value.replace(/\D/g, '').slice(0, 8);
    if (digits.length >= 5) {
        input.value = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length >= 3) {
        input.value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
        input.value = digits;
    }
}

function promoteGradeFor2027(gradeStr) {
    const norm = normalizeText(gradeStr);
    if (!norm) return gradeStr;

    // Evitar doble promoción si ya está en 2° año de bachillerato
    if (norm.includes('2') && norm.includes('bachillerato')) return '2° Año de Bachillerato "A"';
    if (norm.includes('1') && norm.includes('bachillerato')) return '2° Año de Bachillerato "A"';

    // Parvularia
    if (norm.includes('parvularia 4')) return 'Parvularia 5';
    if (norm.includes('parvularia 5')) return 'Parvularia 6';
    if (norm.includes('parvularia 6')) return '1° Grado "A"';

    // Educación Básica (1° a 9° Grado)
    if (norm.includes('1') && norm.includes('grado')) return '2° Grado "A"';
    if (norm.includes('2') && norm.includes('grado')) return '3° Grado "A"';
    if (norm.includes('3') && norm.includes('grado')) return '4° Grado "A"';
    if (norm.includes('4') && norm.includes('grado')) return '5° Grado "A"';
    if (norm.includes('5') && norm.includes('grado')) return '6° Grado "A"';
    if (norm.includes('6') && norm.includes('grado')) return '7° Grado "A"';
    if (norm.includes('7') && norm.includes('grado')) return '8° Grado "A"';
    if (norm.includes('8') && norm.includes('grado')) return '9° Grado "A"';
    if (norm.includes('9') && norm.includes('grado')) return '1° Año de Bachillerato "A"';

    return gradeStr;
}