// =========================================================================
// 2. ESTADO GLOBAL DE LA APLICACIÓN Y CONEXIÓN GOOGLE SHEETS (APPS SCRIPT)
// =========================================================================
// PEGA AQUÍ LA URL DE TU APLICACIÓN WEB DE GOOGLE APPS SCRIPT (termina en /exec):
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzsjn88k8dcbqUqOTQad4d_A_V2U4xYdqxKJx930JUki7Og6JMYYiteNsc-0cqxwL0b/exec";
const ACCESS_PIN = "10844"; // Debe coincidir con el PIN_SECRETO de tu Apps Script

let studentsDB = [];
let currentStudentIndex = -1; // -1 = Nuevo estudiante
let rawImportedRows = [];
let rawImportedHeaders = [];

// Datos de ejemplo precargados para que el usuario pueda probar al instante si no usa Google Sheets aún
const SAMPLE_STUDENTS = [
    {
        nie: '4589210',
        grado: '5° Grado "A"',
        primer_apellido: 'HERNÁNDEZ',
        segundo_apellido: 'LÓPEZ',
        primer_nombre: 'CARLOS',
        segundo_nombre: 'EDUARDO',
        estudiante_nuevo: 'NO',
        repite_grado: 'NO',
        extranjero: 'NO',
        distrito_nacimiento: 'El Paraíso',
        fecha_nacimiento: '14/05/2016',
        genero: 'M',
        grupo_sanguineo: 'O+',
        direccion_estudiante: 'Caserío La Angostura, Cantón Santa Bárbara',
        sufre_enfermedad: 'NO',
        especifique_enfermedad: '',
        consume_medicamentos: 'NO',
        frecuencia_medicamentos: '',
        diagnostico_medico: 'NO',
        correo_clases: 'carlos.hernandez2016@clases.edu.sv',
        vacunas_completas: 'SÍ',
        problemas_visuales: 'NO',
        presenta_discapacidad: 'Ninguna',
        padre_documento: '03456789-1',
        padre_primer_apellido: 'HERNÁNDEZ',
        padre_segundo_apellido: 'RIVERA',
        padre_nombres: 'JOSÉ MANUEL',
        padre_telefono: '7845-1234',
        padre_direccion: 'Caserío La Angostura',
        padre_nivel_educativo: 'Básica',
        madre_documento: '04123456-8',
        madre_primer_apellido: 'LÓPEZ',
        madre_segundo_apellido: 'GARCÍA',
        madre_nombres: 'MARÍA ELENA',
        madre_telefono: '7612-9876',
        madre_direccion: 'Caserío La Angostura',
        madre_nivel_educativo: 'Bachillerato',
        rep_documento: '04123456-8',
        rep_primer_apellido: 'LÓPEZ',
        rep_segundo_apellido: 'GARCÍA',
        rep_nombres: 'MARÍA ELENA',
        rep_telefono: '7612-9876',
        rep_direccion: 'Caserío La Angostura',
        rep_nivel_educativo: 'Bachillerato',
        rep_parentesco: 'Madre',
        autoriza_foto: 'SÍ',
        compromiso_nombre: 'MARÍA ELENA LÓPEZ GARCÍA',
        docente_nombre: 'Lic. Ana Patricia Menjívar',
        encargado_firma_nombre: 'MARÍA ELENA LÓPEZ GARCÍA'
    },
    {
        nie: '4712034',
        grado: '7° Grado "A"',
        primer_apellido: 'MARTÍNEZ',
        segundo_apellido: 'ALAS',
        primer_nombre: 'SOFÍA',
        segundo_nombre: 'VALERIA',
        estudiante_nuevo: 'NO',
        repite_grado: 'NO',
        extranjero: 'NO',
        distrito_nacimiento: 'Chalatenango',
        fecha_nacimiento: '22/09/2014',
        genero: 'F',
        grupo_sanguineo: 'A+',
        direccion_estudiante: 'Cantón Santa Bárbara, El Paraíso',
        sufre_enfermedad: 'SÍ',
        especifique_enfermedad: 'Asma leve',
        consume_medicamentos: 'SÍ',
        frecuencia_medicamentos: 'Salbutamol inhalador solo en crisis',
        diagnostico_medico: 'NO',
        correo_clases: 'sofia.martinez2014@clases.edu.sv',
        vacunas_completas: 'SÍ',
        problemas_visuales: 'SÍ',
        presenta_discapacidad: 'Ninguna',
        padre_documento: '02987654-3',
        padre_primer_apellido: 'MARTÍNEZ',
        padre_segundo_apellido: 'CRUZ',
        padre_nombres: 'ROBERTO CARLOS',
        padre_telefono: '7234-5678',
        padre_direccion: 'Cantón Santa Bárbara',
        padre_nivel_educativo: 'Bachillerato',
        madre_documento: '03876543-0',
        madre_primer_apellido: 'ALAS',
        madre_segundo_apellido: 'PORTILLO',
        madre_nombres: 'CLAUDIA PATRICIA',
        madre_telefono: '7901-2345',
        madre_direccion: 'Cantón Santa Bárbara',
        madre_nivel_educativo: 'Técnico',
        rep_documento: '02987654-3',
        rep_primer_apellido: 'MARTÍNEZ',
        rep_segundo_apellido: 'CRUZ',
        rep_nombres: 'ROBERTO CARLOS',
        rep_telefono: '7234-5678',
        rep_direccion: 'Cantón Santa Bárbara',
        rep_nivel_educativo: 'Bachillerato',
        rep_parentesco: 'Padre',
        autoriza_foto: 'SÍ',
        compromiso_nombre: 'ROBERTO CARLOS MARTÍNEZ CRUZ',
        docente_nombre: 'Prof. Edwin Alexander Guardado',
        encargado_firma_nombre: 'ROBERTO CARLOS MARTÍNEZ CRUZ'
    },
    {
        nie: '4900112',
        grado: '1° Grado "A"',
        primer_apellido: 'GUARDADO',
        segundo_apellido: 'MENJÍVAR',
        primer_nombre: 'MATEO',
        segundo_nombre: 'ALEJANDRO',
        estudiante_nuevo: 'SÍ',
        repite_grado: 'NO',
        extranjero: 'NO',
        distrito_nacimiento: 'El Paraíso',
        fecha_nacimiento: '03/02/2020',
        genero: 'M',
        grupo_sanguineo: 'O-',
        direccion_estudiante: 'Caserío La Angostura',
        sufre_enfermedad: 'NO',
        especifique_enfermedad: '',
        consume_medicamentos: 'NO',
        frecuencia_medicamentos: '',
        diagnostico_medico: 'NO',
        correo_clases: '',
        vacunas_completas: 'SÍ',
        problemas_visuales: 'NO',
        presenta_discapacidad: 'Ninguna',
        padre_documento: '',
        padre_primer_apellido: '',
        padre_segundo_apellido: '',
        padre_nombres: '',
        padre_telefono: '',
        padre_direccion: '',
        padre_nivel_educativo: '',
        madre_documento: '05112233-4',
        madre_primer_apellido: 'MENJÍVAR',
        madre_segundo_apellido: 'SERRANO',
        madre_nombres: 'ROSA AMELIA',
        madre_telefono: '7455-8899',
        madre_direccion: 'Caserío La Angostura',
        madre_nivel_educativo: 'Básica',
        rep_documento: '05112233-4',
        rep_primer_apellido: 'MENJÍVAR',
        rep_segundo_apellido: 'SERRANO',
        rep_nombres: 'ROSA AMELIA',
        rep_telefono: '7455-8899',
        rep_direccion: 'Caserío La Angostura',
        rep_nivel_educativo: 'Básica',
        rep_parentesco: 'Madre',
        autoriza_foto: 'SÍ',
        compromiso_nombre: 'ROSA AMELIA MENJÍVAR SERRANO',
        docente_nombre: 'Profa. Karla Beatriz Landaverde',
        encargado_firma_nombre: 'ROSA AMELIA MENJÍVAR SERRANO'
    }
];

// =========================================================================
// 3. INICIALIZACIÓN, CARGA DESDE GOOGLE SHEETS Y GESTIÓN DE LOGOS
// =========================================================================
window.addEventListener('DOMContentLoaded', () => {
    loadSavedLogos();
    if (GOOGLE_APPS_SCRIPT_URL && GOOGLE_APPS_SCRIPT_URL.trim() !== "") {
        loadFromGoogleSheets(GOOGLE_APPS_SCRIPT_URL.trim());
    } else {
        // Cargar ejemplos iniciales si aún no se configura Google Sheets
        studentsDB = JSON.parse(JSON.stringify(SAMPLE_STUDENTS));
        updateGradeFilters();
        renderStudentsList();
        if (studentsDB.length > 0) {
            selectStudent(0);
        }
    }
});

async function loadFromGoogleSheets(url) {
    try {
        showToast('Cargando base de datos segura desde Google Sheets...', 'info');
        const response = await fetch(`${url}?pin=${encodeURIComponent(ACCESS_PIN)}`);
        const result = await response.json();

        if (result.status !== 'success') {
            showToast('Error de acceso: ' + (result.message || 'PIN incorrecto'), 'error');
            return;
        }

        const jsonMatrix = result.data;
        if (!jsonMatrix || jsonMatrix.length < 2) {
            studentsDB = [];
            updateGradeFilters();
            renderStudentsList();
            createNewStudent();
            showToast('Conectado a Google Sheets (La hoja aún no tiene alumnos).', 'info');
            return;
        }

        const headers = jsonMatrix[0].map(h => normalizeText(h));
        const rows = jsonMatrix.slice(1).filter(row => row.some(cell => String(cell).trim() !== ''));

        const colMap = {};
        FIELD_DEFINITIONS.forEach(field => {
            const normLabel = normalizeText(field.label);
            let idx = headers.findIndex(nh => nh === normLabel || field.aliases.some(al => normalizeText(al) === nh));
            if (idx === -1) {
                idx = headers.findIndex(nh => nh.length > 2 && (normLabel.includes(nh) || field.aliases.some(al => nh.includes(normalizeText(al)))));
            }
            colMap[field.key] = idx;
        });

        studentsDB = rows.map(row => {
            const st = {};
            FIELD_DEFINITIONS.forEach(field => {
                const cIdx = colMap[field.key];
                st[field.key] = (cIdx >= 0 && row[cIdx] !== undefined && row[cIdx] !== null) ? String(row[cIdx]).trim() : '';
            });
            return st;
        });

        updateGradeFilters();
        renderStudentsList();
        if (studentsDB.length > 0) selectStudent(0);
        showToast(`¡Conectado! ${studentsDB.length} estudiantes cargados desde Google Sheets.`, 'success');
    } catch (err) {
        console.error(err);
        showToast('Error al conectar con Google Apps Script.', 'error');
    }
}

async function syncToGoogleSheets() {
    if (!GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL.trim() === "") return;
    try {
        showToast('Guardando en Google Sheets...', 'info');
        const headers = FIELD_DEFINITIONS.map(f => f.label);
        const rows = studentsDB.map(st => FIELD_DEFINITIONS.map(f => st[f.key] || ''));

        const response = await fetch(GOOGLE_APPS_SCRIPT_URL.trim(), {
            method: 'POST',
            body: JSON.stringify({
                pin: ACCESS_PIN,
                headers: headers,
                rows: rows
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showToast('¡Sincronizado y guardado en Google Sheets!', 'success');
        } else {
            showToast('No se pudo guardar en Google Sheets: ' + result.message, 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Error de red al guardar en Google Sheets.', 'error');
    }
}

function uploadLogo(event, storageKey) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            localStorage.setItem(storageKey, e.target.result);
            loadSavedLogos();
            showToast('Logo guardado correctamente en el navegador.', 'success');
        } catch (err) {
            showToast('La imagen es muy pesada para guardarla. Usa una imagen más ligera.', 'error');
        }
    };
    reader.readAsDataURL(file);
}

function loadSavedLogos() {
    const leftData = localStorage.getItem('leftLogo');
    const rightData = localStorage.getItem('rightLogo');

    const leftImg = document.getElementById('leftLogoImg');
    const leftPh = document.getElementById('leftLogoPlaceholder');
    if (leftImg && leftPh) {
        if (leftData) {
            leftImg.src = leftData;
            leftImg.classList.remove('hidden');
            leftPh.classList.add('hidden');
        } else {
            leftImg.classList.add('hidden');
            leftPh.classList.remove('hidden');
        }
    }

    const rightImg = document.getElementById('rightLogoImg');
    const rightPh = document.getElementById('rightLogoPlaceholder');
    if (rightImg && rightPh) {
        if (rightData) {
            rightImg.src = rightData;
            rightImg.classList.remove('hidden');
            rightPh.classList.add('hidden');
        } else {
            rightImg.classList.add('hidden');
            rightPh.classList.remove('hidden');
        }
    }
}

function resetLogos() {
    localStorage.removeItem('leftLogo');
    localStorage.removeItem('rightLogo');
    loadSavedLogos();
    showToast('Logos restaurados a los predeterminados.', 'info');
}

// =========================================================================
// 4. INTERACCIÓN CON CASILLAS SÍ / NO DE LA FICHA OFICIAL
// =========================================================================
function toggleYesNoField(el) {
    const current = el.textContent.trim().toUpperCase();
    if (current === '') el.textContent = 'SÍ';
    else if (current === 'SÍ') el.textContent = 'NO';
    else el.textContent = '';
}

function selectRadioBox(el) {
    const group = el.getAttribute('data-group');
    const isAlreadyMarked = el.textContent.trim() === 'X';
    document.querySelectorAll(`#fichaFormSheet .ficha-check-box[data-group="${group}"]`).forEach(box => {
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
// 5. LECTURA Y LLENADO DEL FORMULARIO DE LA FICHA
// =========================================================================
function populateSheetForm(sheetElement, studentData) {
    const data = studentData || {};

    // Campos de texto (inputs)
    sheetElement.querySelectorAll('input[data-field]').forEach(input => {
        const key = input.getAttribute('data-field');
        input.value = data[key] !== undefined && data[key] !== null ? String(data[key]) : '';
    });

    // Casillas simples (SÍ / NO escrito dentro de la línea)
    sheetElement.querySelectorAll('.ficha-check-box[data-field]').forEach(box => {
        const key = box.getAttribute('data-field');
        box.textContent = normalizeYesNo(data[key]);
    });

    // Casillas de grupo (Sí [X] No [ ])
    const radioGroups = ['consume_medicamentos', 'diagnostico_medico', 'vacunas_completas', 'problemas_visuales', 'autoriza_foto'];
    radioGroups.forEach(group => {
        setRadioGroupValue(sheetElement, group, data[group]);
    });
}

function extractDataFromSheetForm(sheetElement) {
    const record = {};

    sheetElement.querySelectorAll('input[data-field]').forEach(input => {
        const key = input.getAttribute('data-field');
        record[key] = input.value.trim();
    });

    sheetElement.querySelectorAll('.ficha-check-box[data-field]').forEach(box => {
        const key = box.getAttribute('data-field');
        record[key] = box.textContent.trim();
    });

    const radioGroups = ['consume_medicamentos', 'diagnostico_medico', 'vacunas_completas', 'problemas_visuales', 'autoriza_foto'];
    radioGroups.forEach(group => {
        record[group] = getRadioGroupValue(sheetElement, group);
    });

    return record;
}

function autoFillCompromiso() {
    const sheet = document.getElementById('fichaFormSheet');
    const data = extractDataFromSheetForm(sheet);

    // Prioridad: Representante -> Madre -> Padre
    let fullName = '';
    if (data.rep_nombres || data.rep_primer_apellido) {
        fullName = `${data.rep_nombres} ${data.rep_primer_apellido} ${data.rep_segundo_apellido}`.replace(/\s+/g, ' ').trim();
    } else if (data.madre_nombres || data.madre_primer_apellido) {
        fullName = `${data.madre_nombres} ${data.madre_primer_apellido} ${data.madre_segundo_apellido}`.replace(/\s+/g, ' ').trim();
    } else if (data.padre_nombres || data.padre_primer_apellido) {
        fullName = `${data.padre_nombres} ${data.padre_primer_apellido} ${data.padre_segundo_apellido}`.replace(/\s+/g, ' ').trim();
    }

    if (!fullName) {
        showToast('Ingresa primero los nombres del Representante, Madre o Padre en la tabla.', 'warning');
        return;
    }

    sheet.querySelector('input[data-field="compromiso_nombre"]').value = fullName.toUpperCase();
    sheet.querySelector('input[data-field="encargado_firma_nombre"]').value = fullName.toUpperCase();
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
    populateSheetForm(document.getElementById('fichaFormSheet'), student);
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

    populateSheetForm(document.getElementById('fichaFormSheet'), {
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
    const sheet = document.getElementById('fichaFormSheet');
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

updateGradeFilters();
selectStudent(currentStudentIndex);
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

    // Ajustar ancho de columnas
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

            // Leer como matriz para preservar encabezados exactos
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
            event.target.value = ''; // Permitir volver a subir el mismo archivo
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
        // Intentar coincidencia automática
        let matchedIndex = -1;
        const normLabel = normalizeText(field.label);

        // 1. Coincidencia exacta con etiqueta o alias
        matchedIndex = normalizedHeaders.findIndex(nh =>
            nh === normLabel || field.aliases.some(al => normalizeText(al) === nh)
        );

        // 2. Coincidencia parcial si no hubo exacta
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

    const templateSheet = document.getElementById('fichaFormSheet');

    list.forEach(student => {
        const clone = templateSheet.cloneNode(true);
        clone.removeAttribute('id');
        populateSheetForm(clone, student);
        batchContainer.appendChild(clone);
    });

    closeBatchModal();
    document.body.classList.add('printing-batch');

    setTimeout(() => {
        window.print();
        // Restaurar estado normal después del diálogo de impresión
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