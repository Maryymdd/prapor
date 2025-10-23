<script setup>
import { ref, reactive, watch } from 'vue'
import KonvaStage from '@/components/KonvaStage.vue'
import ResultsModal from '@/components/ResultsModal.vue'
import { gaussianElimination } from '@/utils/gauss'

const stageRef = ref(null)
const stageSize = reactive({ width: 0, height: 0 })
const shapesCount = ref(0)
const rods = ref([]) // массив стержней
const editingId = ref(null) // id редактируемого стержня или null
const loads = ref([]) // массив нагрузок на узлы
const rodLoads = ref([]) // массив нагрузок на стержни

// Форма добавления нагрузки на узлы (только Fx)
const loadForm = reactive({
  nodeNumber: 1,
  forceX: 0,
})

// Форма добавления нагрузки на стержни (только qx)
const rodLoadForm = reactive({
  rodNumber: 1,
  forceX: 0,
})

const isEditingLoad = ref(false)
const isEditingRodLoad = ref(false)

// Заделка (по умолчанию слева)
const embedment = ref('left')

// Сетка (1 клетка = 1 см)
const showGrid = ref(true)
const gridOpacity = ref(0.25)
const gridColor = ref('rgba(255,255,255,0.2)')
const GRID_SIZE_CM = '1cm'

// Файл: сохранение/загрузка
const fileInputRef = ref(null)

// Состояние модального окна результатов
const showResultsModal = ref(false)
const calculationResults = ref({})

// Watcher для перерисовки при изменении заделки
watch(embedment, () => {
  rebuildStageFromRods()
})

// Watcher для перерисовки при изменении количества стержней
watch(() => rods.value.length, () => {
  rebuildStageFromRods()
})

// Перерисовываем сцену при изменении нагрузок на узлы
watch(loads, () => {
  rebuildStageFromRods()
}, { deep: true })

// Перерисовываем сцену при изменении распределённых нагрузок на стержни
watch(rodLoads, () => {
  rebuildStageFromRods()
}, { deep: true })

// Форма добавления стержня
const form = reactive({
  L: 1,
  A: 1,
  E: 2e11,
  sigma: 160e6,
})

function onStats(payload) {
  stageSize.width = payload.width
  stageSize.height = payload.height
  shapesCount.value = payload.count
}

// Снимок текущей модели приложения
function getModelSnapshot() {
  return {
    embedment: embedment.value,
    rods: rods.value.slice(),
    loads: loads.value.slice(),
    rodLoads: rodLoads.value.slice(),
  }
}

// Формальная валидация модели
// Возвращает объект: { status: 'ok' | 'warnings' | 'errors', warnings: string[], errors: string[] }
function validateModel(model) {
  const warnings = []
  const errors = []

  // 1) Общие структуры
  const rodsArr = Array.isArray(model?.rods) ? model.rods : []
  const loadsArr = Array.isArray(model?.loads) ? model.loads : []
  const rodLoadsArr = Array.isArray(model?.rodLoads) ? model.rodLoads : []

  if (rodsArr.length === 0) warnings.push('Модель не содержит стержней')

  // 2) Стержни
  rodsArr.forEach((r, idx) => {
    const indexLabel = `Стержень ${idx + 1}`
    const L = Number(r?.L)
    const A = Number(r?.A)
    const E = Number(r?.E)
    const sigma = Number(r?.sigma)
    if (!Number.isFinite(L) || L <= 0) errors.push(`${indexLabel}: L должно быть > 0`)
    if (!Number.isFinite(A) || A <= 0) errors.push(`${indexLabel}: A должно быть > 0`)
    if (!Number.isFinite(E) || E <= 0) errors.push(`${indexLabel}: E должно быть > 0`)
    if (!Number.isFinite(sigma) || sigma <= 0) errors.push(`${indexLabel}: σ должно быть > 0`)
  })

  // 3) Узловые нагрузки
  const maxNode = rodsArr.length + 1
  const seenNode = new Map()
  loadsArr.forEach((l, i) => {
    const node = Number(l?.nodeNumber)
    const fx = Number(l?.forceX)
    if (!Number.isInteger(node)) errors.push(`Нагрузка F[${i + 1}]: nodeNumber должен быть целым`)
    if (!(node >= 1 && node <= maxNode)) errors.push(`Нагрузка F[${i + 1}]: узел ${node} вне диапазона 1..${maxNode}`)
    const key = node
    if (seenNode.has(key)) errors.push(`Дублирующая нагрузка на узел ${node}`)
    else seenNode.set(key, true)
    if (!Number.isFinite(fx)) errors.push(`Нагрузка F[${i + 1}]: Fx не число`)
    if (fx === 0) warnings.push(`Нагрузка F на узел ${node}: Fx = 0 (бессмысленно)`) 
  })

  // 4) Распределённые нагрузки на стержни
  const seenRod = new Map()
  rodLoadsArr.forEach((l, i) => {
    const rod = Number(l?.rodNumber)
    const qx = Number(l?.forceX)
    if (!Number.isInteger(rod)) errors.push(`Нагрузка q[${i + 1}]: rodNumber должен быть целым`)
    if (!(rod >= 1 && rod <= rodsArr.length)) errors.push(`Нагрузка q[${i + 1}]: стержень ${rod} вне диапазона 1..${rodsArr.length}`)
    const key = rod
    if (seenRod.has(key)) errors.push(`Дублирующая нагрузка q на стержень ${rod}`)
    else seenRod.set(key, true)
    if (!Number.isFinite(qx)) errors.push(`Нагрузка q[${i + 1}]: qx не число`)
    if (qx === 0) warnings.push(`Нагрузка q на стержень ${rod}: qx = 0 (бессмысленно)`) 
  })

  // 5) Заделка
  const emb = model?.embedment
  if (emb != null && emb !== 'left' && emb !== 'right' && emb !== 'both') {
    warnings.push('Неизвестный тип заделки, будет использовано значение по умолчанию')
  }

  const status = errors.length > 0 ? 'errors' : (warnings.length > 0 ? 'warnings' : 'ok')
  return { status, warnings, errors }
}

// Состояние панели диагностики
const validation = reactive({ status: null, warnings: [], errors: [], source: '', message: '' })

function setValidation(diag, source) {
  validation.status = diag?.status || null
  validation.warnings = diag?.warnings || []
  validation.errors = diag?.errors || []
  validation.source = source || ''
  if (validation.status === 'ok') {
    validation.message = source === 'load' ? 'Файл корректен' : 'Модель корректна'
  } else if (validation.status === 'warnings') {
    validation.message = source === 'load' ? 'Файл загружен с предупреждениями' : 'Модель содержит предупреждения'
  } else if (validation.status === 'errors') {
    validation.message = source === 'load' ? 'Ошибка в файле' : 'Ошибки в модели'
  } else {
    validation.message = ''
  }
}

// Запуск расчёта с предварительной валидацией
function onCalculate() {
  const diag = validateModel(getModelSnapshot())
  setValidation(diag, 'calculate')
  if (diag.status === 'errors') return

  try {
    const { K, F } = assembleSystem()
    applyBoundaryConditions(K, F)
    const result = gaussianElimination(K, F)
    
    // Нормализация перемещений
    const normalizedDisplacements = normalizeDisplacements(result.x)
    
    // Сохраняем результаты для модального окна
    calculationResults.value = {
      displacements: result.x,
      normalizedDisplacements: normalizedDisplacements,
      gaussSteps: result.steps,
      stiffnessMatrix: K,
      forceVector: F
    }
    
    // Показываем модальное окно с результатами
    showResultsModal.value = true
    
    console.log('Перемещения узлов u (м):', result.x)
    console.log('Нормализованные перемещения (коэффициенты):', normalizedDisplacements)
    console.log('Лог Гаусса:', result.steps)
  } catch (e) {
    console.error(e)
    alert('Ошибка расчёта: ' + (e && e.message ? e.message : 'неизвестная ошибка'))
  }
}

function assembleSystem() {
  const n = rods.value.length + 1
  if (n <= 1) throw new Error('Нет стержней для расчёта')

  const K = Array.from({ length: n }, () => Array.from({ length: n }, () => 0))
  const F = Array.from({ length: n }, () => 0)

  // Сборка глобальной жёсткости (1D осевая: k = AE/L * [[1,-1],[-1,1]])
  rods.value.forEach((r, idx) => {
    const L = Number(r.L)
    const A = Number(r.A)
    const E = Number(r.E)
    const k = (E * A) / L
    const i = idx
    const j = idx + 1
    K[i][i] += k
    K[i][j] -= k
    K[j][i] -= k
    K[j][j] += k
  })

  // Узловые нагрузки F
  loads.value.forEach(l => {
    const node = Number(l.nodeNumber) - 1
    if (node >= 0 && node < F.length) {
      F[node] += Number(l.forceX)
    }
  })

  // Распределённые нагрузки qx на стержни → экв. узловые силы [qL/2; qL/2]
  rodLoads.value.forEach(l => {
    const rodIdx = Number(l.rodNumber) - 1
    if (rodIdx >= 0 && rodIdx < rods.value.length) {
      const qx = Number(l.forceX)
      const L = Number(rods.value[rodIdx].L)
      const f = (qx * L) / 2
      F[rodIdx] += f
      F[rodIdx + 1] += f
    }
  })

  return { K, F }
}

function normalizeDisplacements(displacements) {
  const normalized = []
  
  displacements.forEach((u, nodeIndex) => {
    // Находим стержень, к которому относится этот узел
    let rodIndex = -1
    if (nodeIndex === 0) {
      rodIndex = 0 // левый узел первого стержня
    } else if (nodeIndex === displacements.length - 1) {
      rodIndex = rods.value.length - 1 // правый узел последнего стержня
    } else {
      rodIndex = nodeIndex - 1 // узел между стержнями
    }
    
    if (rodIndex >= 0 && rodIndex < rods.value.length) {
      const rod = rods.value[rodIndex]
      const L = Number(rod.L)
      const A = Number(rod.A)
      const E = Number(rod.E)
      
      // Находим характерную силу для этого узла
      let characteristicForce = 1 // по умолчанию 1 Н
      let forceType = 'default'
      
      // Приоритет: сначала узловые нагрузки на этот узел
      const nodeLoad = loads.value.find(l => Number(l.nodeNumber) === nodeIndex + 1)
      if (nodeLoad) {
        characteristicForce = Math.abs(Number(nodeLoad.forceX))
        forceType = 'nodal'
      } else {
        // Если нет узловой нагрузки, ищем распределённую на соседние стержни
        const rodLoad = rodLoads.value.find(l => Number(l.rodNumber) === rodIndex + 1)
        if (rodLoad) {
          characteristicForce = Math.abs(Number(rodLoad.forceX) * L) // q*L
          forceType = 'distributed'
        }
      }
      
      // Нормализация: u / (F*L/(E*A))
      const denominator = (characteristicForce * L) / (E * A)
      const normalizedValue = denominator !== 0 ? u / denominator : 0
      
      normalized.push({
        node: nodeIndex + 1,
        displacement: u,
        coefficient: normalizedValue,
        formula: `u${nodeIndex + 1} = ${normalizedValue.toFixed(6)} × (F×L)/(E×A)`,
        forceType: forceType,
        details: {
          F: characteristicForce,
          L: L,
          E: E,
          A: A,
          denominator: denominator
        }
      })
    }
  })
  
  return normalized
}

function applyBoundaryConditions(K, F) {
  const n = K.length
  const fixNode = (index) => {
    for (let c = 0; c < n; c++) {
      if (c !== index) {
        K[index][c] = 0
        K[c][index] = 0
      }
    }
    K[index][index] = 1
    F[index] = 0
  }

  if (embedment.value === 'left') {
    fixNode(0)
  } else if (embedment.value === 'right') {
    fixNode(n - 1)
  } else if (embedment.value === 'both') {
    // если один стержень — фиксируем оба узла; если несколько — крайние
    fixNode(0)
    fixNode(n - 1)
  }
}

// Панорамирование двумя пальцами (тачпад): обрабатываем колесо как сдвиг
function onWheelPan(event) {
  if (event.ctrlKey) return
  const dx = event.deltaX
  
  if (dx === 0) return
  // Передаём смещение в компонент сцены
  stageRef.value?.panBy?.(dx, 0)
}

// Сброс положения сцены к исходному (центрирование)
function resetView() {
  stageRef.value?.resetView?.()
}

function zoomIn() {
  stageRef.value?.zoomByCenter?.(1.1)
}

function zoomOut() {
  stageRef.value?.zoomByCenter?.(1/1.1)
}

function addRect() {
  // Валидация параметров стержня
  if (form.L <= 0) {
    alert('Длина стержня (L) должна быть больше 0')
    return
  }
  
  if (form.A <= 0) {
    alert('Площадь поперечного сечения (A) должна быть больше 0')
    return
  }
  
  if (form.E <= 0) {
    alert('Модуль упругости (E) должен быть больше 0')
    return
  }
  
  if (form.sigma <= 0) {
    alert('Допустимое напряжение (σ) должно быть больше 0')
    return
  }
  
  if (editingId.value) {
    // Режим редактирования - обновляем существующий стержень
    const rodIndex = rods.value.findIndex(r => r.id === editingId.value)
    if (rodIndex !== -1) {
      rods.value[rodIndex] = {
        id: editingId.value,
        L: form.L,
        A: form.A,
        E: form.E,
        sigma: form.sigma,
      }
      editingId.value = null
      rebuildStageFromRods()
    }
  } else {
    // Режим добавления - создаем новый стержень
  stageRef.value?.addRect?.({ ...form })

  rods.value.push({
    id: Date.now(),
    L: form.L,
    A: form.A,
    E: form.E,
    sigma: form.sigma,
  })
  }
}

function clearLayer() {
  const proceed = confirm('Вы уверены, что хотите удалить все стержни и нагрузки?')
  if (!proceed) return
  stageRef.value?.clearLayer?.()
  rods.value = []
  // Полная очистка всех нагрузок
  loads.value = []
  rodLoads.value = []
  // Сброс состояний форм
  isEditingLoad.value = false
  loadForm.nodeNumber = 1
  loadForm.forceX = 0
  rodLoadForm.rodNumber = 1
  rodLoadForm.forceX = 0
}

// Сохранение проекта в JSON
async function saveProject() {
  // Валидация перед сохранением
  const diag = validateModel(getModelSnapshot())
  if (diag.status === 'errors') {
    alert(`Нельзя сохранить: ошибки в модели\n\n${diag.errors.join('\n')}`)
    return
  }
  if (diag.status === 'warnings') {
    const proceed = confirm(`Есть предупреждения модели:\n\n${diag.warnings.join('\n')}\n\nСохранить всё равно?`)
    if (!proceed) return
  }
  setValidation(diag, 'save')

  const payload = {
    version: 1,
    embedment: embedment.value,
    rods: rods.value.map(r => ({ id: r.id, L: r.L, A: r.A, E: r.E, sigma: r.sigma })),
    loads: loads.value.map(l => ({ id: l.id, nodeNumber: l.nodeNumber, forceX: l.forceX })),
    rodLoads: rodLoads.value.map(l => ({ id: l.id, rodNumber: l.rodNumber, forceX: l.forceX })),
  }
  const defaultName = `project-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`
  const fileName = defaultName
  const jsonText = JSON.stringify(payload, null, 2)

  // Современный способ (Chromium): выбор папки/файла пользователем
  try {
    if (window && 'showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          { description: 'JSON файл проекта', accept: { 'application/json': ['.json'] } },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(new Blob([jsonText], { type: 'application/json' }))
      await writable.close()
      alert('Файл сохранён')
      return
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return
    console.error('showSaveFilePicker error:', e)
    // пойдём по запасному пути
  }

  // Запасной способ: стандартная загрузка (место сохранения решает браузер)
  const blob = new Blob([jsonText], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  URL.revokeObjectURL(a.href)
  document.body.removeChild(a)
}

function triggerLoadProject() {
  fileInputRef.value?.click()
}

function onProjectFileSelected(event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || '{}'))
      if (!data || typeof data !== 'object') throw new Error('Некорректный файл')
      const listRods = Array.isArray(data.rods) ? data.rods : []
      const listLoads = Array.isArray(data.loads) ? data.loads : []
      const listRodLoads = Array.isArray(data.rodLoads) ? data.rodLoads : []

      // Готовим новые данные, валидируем, затем применяем
      const newEmbedment = (data.embedment === 'left' || data.embedment === 'right' || data.embedment === 'both') ? data.embedment : 'left'
      const newRods = listRods.map((r, i) => ({
        id: r?.id ?? (Date.now() + i),
        L: Number(r?.L ?? 20),
        A: Number(r?.A ?? 80),
        E: Number(r?.E ?? 2e11),
        sigma: Number(r?.sigma ?? 160e6),
      }))
      const newLoads = listLoads.map((l, i) => ({
        id: l?.id ?? (Date.now() + 1000 + i),
        nodeNumber: Number(l?.nodeNumber ?? 1),
        forceX: Number(l?.forceX ?? 0),
      }))
      const newRodLoads = listRodLoads.map((l, i) => ({
        id: l?.id ?? (Date.now() + 2000 + i),
        rodNumber: Number(l?.rodNumber ?? 1),
        forceX: Number(l?.forceX ?? 0),
      }))

      const diag = validateModel({ embedment: newEmbedment, rods: newRods, loads: newLoads, rodLoads: newRodLoads })
      setValidation(diag, 'load')
      if (diag.status === 'errors') {
        alert(`Ошибка в файле проекта. Загрузка отменена.\n\n${diag.errors.join('\n')}`)
        return
      }

      // Применяем настройки после успешной проверки
      embedment.value = newEmbedment
      rods.value = newRods
      loads.value = newLoads
      rodLoads.value = newRodLoads

      rebuildStageFromRods()
      // Сообщение показывается в панели диагностики
    } catch (e) {
      console.error(e)
      alert('Не удалось загрузить файл проекта')
    } finally {
      if (event?.target) event.target.value = ''
    }
  }
  reader.readAsText(file)
}

function rebuildStageFromRods() {
  stageRef.value?.clearLayer?.()
  rods.value.forEach((rod, index) => {
    const leftNode = index + 1
    const rightNode = index + 2
    const leftLoad = getLoadsForNode(leftNode)[0]
    const rightLoad = getLoadsForNode(rightNode)[0]
    const qLoad = getLoadForRod(index + 1)
    stageRef.value?.addRect?.({
      ...rod,
      embedment: getEmbedmentForRod(index),
      leftNodeFx: leftLoad ? Number(leftLoad.forceX) : 0,
      rightNodeFx: rightLoad ? Number(rightLoad.forceX) : 0,
      leftNodeFy: 0,
      rightNodeFy: 0,
      rodQx: qLoad ? Number(qLoad.forceX) : 0,
      rodQy: 0,
    })
  })
}

// Функция для определения заделки для конкретного стержня
function getEmbedmentForRod(rodIndex) {
  if (embedment.value === 'left' && rodIndex === 0) {
    return 'left'
  } else if (embedment.value === 'right' && rodIndex === rods.value.length - 1) {
    return 'right'
  } else if (embedment.value === 'both') {
    // Если это единственный стержень, возвращаем 'both'
    if (rods.value.length === 1) {
      return 'both'
    }
    // Если несколько стержней
    if (rodIndex === 0) return 'left'
    if (rodIndex === rods.value.length - 1) return 'right'
  }
  return null
}

function onEditRod(rod) {
  editingId.value = rod.id
  form.L = rod.L
  form.A = rod.A
  form.E = rod.E
  form.sigma = rod.sigma

  // Если для этого стержня уже есть q, подготовим форму для редактирования q
  const rodIndex = rods.value.findIndex(r => r.id === rod.id)
  if (rodIndex !== -1) {
    const q = getLoadForRod(rodIndex + 1)
    rodLoadForm.rodNumber = rodIndex + 1
    if (q) {
      rodLoadForm.forceX = Number(q.forceX)
      isEditingRodLoad.value = true
    } else {
      isEditingRodLoad.value = false
      rodLoadForm.forceX = 0
    }
  }
}

function cancelEditRod() {
  editingId.value = null
  form.L = 20
  form.A = 80
  form.E = 2e11
  form.sigma = 160e6
  // Сброс режима редактирования q
  isEditingRodLoad.value = false
  rodLoadForm.rodNumber = 1
  rodLoadForm.forceX = 0
}

function onDeleteRod(id) {
  // Находим индекс удаляемого стержня
  const rodIndex = rods.value.findIndex(r => r.id === id)
  if (rodIndex === -1) return
  const proceed = confirm(`Вы уверены, что хотите удалить стержень № ${rodIndex + 1}?`)
  if (!proceed) return

  // Определяем номера узлов этого стержня
  const leftNodeNumber = rodIndex + 1
  const rightNodeNumber = rodIndex + 2

  // Удаляем сам стержень
  rods.value = rods.value.filter(r => r.id !== id)

  // 1) Удаляем узловые нагрузки на его узлах и переиндексируем узлы справа
  let remainingNodeLoads = loads.value.filter(l => l.nodeNumber !== leftNodeNumber && l.nodeNumber !== rightNodeNumber)
  remainingNodeLoads = remainingNodeLoads.map(l => (
    l.nodeNumber > rightNodeNumber ? { ...l, nodeNumber: l.nodeNumber - 1 } : l
  ))
  loads.value = remainingNodeLoads

  // 2) Удаляем распределённую нагрузку на сам стержень и переиндексируем стержни справа
  let remainingRodLoads = rodLoads.value.filter(l => l.rodNumber !== rodIndex + 1)
  remainingRodLoads = remainingRodLoads.map(l => (
    l.rodNumber > rodIndex + 1 ? { ...l, rodNumber: l.rodNumber - 1 } : l
  ))
  rodLoads.value = remainingRodLoads

  // Перерисовываем
  rebuildStageFromRods()
}

function getOneCmPx() {
  const el = document.createElement('div')
  el.style.position = 'absolute'
  el.style.visibility = 'hidden'
  el.style.width = '1cm'
  el.style.height = '1cm'
  document.body.appendChild(el)
  const px = el.getBoundingClientRect().width || 37.795
  document.body.removeChild(el)
  return px
}

// Функции для работы с нагрузками
function getMaxNodeNumber() {
  return rods.value.length + 1 // количество узлов = количество стержней + 1
}

function addLoad() {
  // Запрет: нельзя добавлять нагрузку, пока не создан первый стержень
  if (rods.value.length === 0) {
    alert('Сначала добавьте стержень 1, затем нагрузку на узел 1')
    return
  }
  const maxNode = getMaxNodeNumber()
  if (loadForm.nodeNumber < 1 || loadForm.nodeNumber > maxNode) {
    alert(`Узел с номером ${loadForm.nodeNumber} не существует. Доступные узлы: 1-${maxNode}`)
    return
  }
  
  // Проверка: нельзя добавить нагрузку если Fx = 0
  if (loadForm.forceX === 0) {
    alert('Нельзя добавить нагрузку, если Fx = 0')
    return
  }
  
  // Проверка 2: нельзя добавить нагрузку если она уже была добавлена
  const existingLoad = loads.value.find(load => load.nodeNumber === loadForm.nodeNumber)
  if (existingLoad) {
    alert(`Нагрузка на узел ${loadForm.nodeNumber} уже существует. Используйте редактирование.`)
    return
  }
  
  // Добавляем нагрузку в массив
  loads.value.push({
    id: Date.now(),
    nodeNumber: Number(loadForm.nodeNumber),
    forceX: Number(loadForm.forceX),
  })
  console.log('Добавлена нагрузка:', loadForm)
}

// Функция для получения нагрузок на узлы стержня
function getLoadsForRod(rodIndex) {
  const leftNode = rodIndex + 1
  const rightNode = rodIndex + 2
  
  const leftLoads = loads.value.filter(load => load.nodeNumber === leftNode)
  const rightLoads = loads.value.filter(load => load.nodeNumber === rightNode)
  
  return { leftLoads, rightLoads }
}

// Функция для получения нагрузок на конкретный узел
function getLoadsForNode(nodeNumber) {
  return loads.value.filter(load => load.nodeNumber === nodeNumber)
}

// Функция для проверки, есть ли ненулевые нагрузки на узле
function hasNonZeroLoads(nodeNumber) {
  const nodeLoads = getLoadsForNode(nodeNumber)
  return nodeLoads.some(load => load.forceX !== 0)
}

// Функции для работы с нагрузками на узлы
function editLoad(nodeNumber) {
  const load = loads.value.find(l => l.nodeNumber === nodeNumber)
  if (load) {
    loadForm.nodeNumber = load.nodeNumber
    loadForm.forceX = load.forceX
    isEditingLoad.value = true
  }
}

function deleteLoad(nodeNumber) {
  const proceed = confirm(`Вы уверены, что хотите удалить все нагрузки на узле ${nodeNumber}?`)
  if (!proceed) return
  loads.value = loads.value.filter(load => load.nodeNumber !== nodeNumber)
}

// Очистить все узловые нагрузки F
function clearAllNodeLoads() {
  const proceed = confirm('Вы уверены, что хотите очистить все узловые нагрузки?')
  if (!proceed) return
  loads.value = []
  // сброс формы
  isEditingLoad.value = false
  loadForm.nodeNumber = 1
  loadForm.forceX = 0
}

function updateLoad() {
  const confirmUpdate = confirm(`Обновить нагрузку на узле ${loadForm.nodeNumber}?`)
  if (!confirmUpdate) return
  // Запрет обновления на нулевое значение
  if (Number(loadForm.forceX) === 0) {
    alert('Нельзя установить нагрузку Fx = 0 при обновлении')
    return
  }
  const existingLoad = loads.value.find(load => load.nodeNumber === loadForm.nodeNumber)
  if (existingLoad) {
    existingLoad.forceX = Number(loadForm.forceX)
    isEditingLoad.value = false
    alert(`Нагрузка на узел ${loadForm.nodeNumber} обновлена`)
  }
}

function cancelEditLoad() {
  isEditingLoad.value = false
  loadForm.nodeNumber = 1
  loadForm.forceX = 0
}

// Функция для получения нагрузки на стержень
function getLoadForRod(rodNumber) {
  return rodLoads.value.find(load => load.rodNumber === rodNumber)
}

// Функции для работы с нагрузками на стержни
function addRodLoad() {
  if (rodLoadForm.rodNumber < 1 || rodLoadForm.rodNumber > rods.value.length) {
    alert(`Стержень с номером ${rodLoadForm.rodNumber} не существует. Доступные стержни: 1-${rods.value.length}`)
    return
  }
  
  // Проверка: нельзя добавить нагрузку если qx = 0
  if (rodLoadForm.forceX === 0) {
    alert('Нельзя добавить нагрузку, если qx = 0')
    return
  }
  
  // Проверка 2: нельзя добавить нагрузку если она уже была добавлена
  const existingLoad = rodLoads.value.find(load => load.rodNumber === rodLoadForm.rodNumber)
  if (existingLoad) {
    alert(`Нагрузка на стержень ${rodLoadForm.rodNumber} уже существует. Используйте редактирование.`)
    return
  }
  
  // Добавляем нагрузку в массив
  rodLoads.value.push({
    id: Date.now(),
    rodNumber: Number(rodLoadForm.rodNumber),
    forceX: Number(rodLoadForm.forceX),
  })
  
  console.log('Добавлена нагрузка на стержень:', rodLoadForm)
}

// Обновить существующую нагрузку q стержня
function updateRodLoad() {
  const confirmUpdate = confirm(`Обновить нагрузку q на стержне ${rodLoadForm.rodNumber}?`)
  if (!confirmUpdate) return
  // Запрет обновления на нулевое значение
  if (Number(rodLoadForm.forceX) === 0) {
    alert('Нельзя установить нагрузку qx = 0 при обновлении')
    return
  }
  const existing = rodLoads.value.find(load => load.rodNumber === rodLoadForm.rodNumber)
  if (existing) {
    existing.forceX = Number(rodLoadForm.forceX)
    isEditingRodLoad.value = false
    alert(`Нагрузка q на стержень ${rodLoadForm.rodNumber} обновлена`)
  }
}

// Отмена редактирования q
function cancelEditRodLoad() {
  isEditingRodLoad.value = false
  rodLoadForm.rodNumber = 1
  rodLoadForm.forceX = 0
}

// Очистить все стержневые нагрузки q
function clearAllRodLoads() {
  const proceed = confirm('Вы уверены, что хотите удалить все распределённые нагрузки на стержнях?')
  if (!proceed) return
  rodLoads.value = []
  isEditingRodLoad.value = false
  rodLoadForm.rodNumber = 1
  rodLoadForm.forceX = 0
}

// Функция для закрытия модального окна результатов
function closeResultsModal() {
  showResultsModal.value = false
}




</script>


<template>
    <div class="page">
      <aside class="side left">
        <div class="panel">
          <div class="rod-card">
            <div class="rod-header">Добавление стержня</div>
            <div class="rod-grid rod-grid--column">
              <div class="rod-cell">
                <label class="rod-label">L =</label>
                <input class="rod-input" type="number" v-model.number="form.L" min="0.1" step="0.1" />
              </div>
              <div class="rod-cell">
                <label class="rod-label">A =</label>
                <input class="rod-input" type="number" v-model.number="form.A" min="0.1" step="0.1" />
              </div>
              <div class="rod-cell">
                <label class="rod-label">E =</label>
                <input class="rod-input" type="number" v-model.number="form.E" min="1000" step="1000" />
              </div>
              <div class="rod-cell">
                <label class="rod-label">σ =</label>
                <input class="rod-input" type="number" v-model.number="form.sigma" min="1000" step="1000" />
              </div>
            </div>
            <div class="rod-footer">
              <button class="rod-add" @click="addRect">{{ editingId ? 'обновить' : 'добавить' }}</button>
              <button v-if="editingId" class="rod-cancel" @click="cancelEditRod">отмена</button>
              <button v-else class="rod-clear" @click="clearLayer">очистить</button>
            </div>
          </div>
          
          <!-- Карточка добавления нагрузки на узлы -->
          <div class="load-card">
            <div class="load-header">Добавление нагрузки F</div>
            <div class="load-grid">
              <div class="load-cell">
                <label class="load-label">Номер узла:</label>
                <input class="load-input" type="number" v-model.number="loadForm.nodeNumber" min="1" :max="getMaxNodeNumber()" />
              </div>
              <div class="load-cell">
                <label class="load-label">По оси X:</label>
                <input class="load-input" type="number" v-model.number="loadForm.forceX" step="0.1" min="0" max="5"/>
              </div>
            </div>
            <div class="load-footer">
              <template v-if="!isEditingLoad">
                <button class="load-add" @click="addLoad">добавить</button>
                <button class="rod-clear" @click="clearAllNodeLoads">очистить</button>
              </template>
              <div v-else class="load-edit-buttons">
                <button class="load-add" @click="updateLoad">обновить</button>
                <button class="load-cancel" @click="cancelEditLoad">отмена</button>
              </div>
            </div>
          </div>
          
          <!-- Карточка добавления нагрузки на стержни -->
          <div class="load-card">
            <div class="load-header">Добавление нагрузки q</div>
            <div class="load-grid">
              <div class="load-cell">
                <label class="load-label">Номер стержня:</label>
                <input class="load-input" type="number" v-model.number="rodLoadForm.rodNumber" min="1" :max="rods.length" />
              </div>
              <div class="load-cell">
                <label class="load-label">По оси X:</label>
                <input class="load-input" type="number" v-model.number="rodLoadForm.forceX" step="0.1" min="0" max="5" />
              </div>
            </div>
            <div class="load-footer">
              <template v-if="!isEditingRodLoad">
                <button class="load-add" @click="addRodLoad">добавить</button>
                <button class="rod-clear" @click="clearAllRodLoads">очистить</button>
              </template>
              <template v-else>
                <button class="load-add" @click="updateRodLoad">обновить</button>
                <button class="load-cancel" @click="cancelEditRodLoad">отмена</button>
              </template>
            </div>
          </div>
          
          <!-- Блок выбора заделки -->
          <div class="embedment-card">
            <div class="embedment-header">Заделка</div>
            <div class="embedment-options">
              <div class="embedment-option" :class="{ 'embedment-option--active': embedment === 'left' }" @click="embedment = 'left'">
                <span>Заделка слева</span>
              </div>
              <div class="embedment-option" :class="{ 'embedment-option--active': embedment === 'right' }" @click="embedment = 'right'">
                <span>Заделка справа</span>
              </div>
              <div class="embedment-option" :class="{ 'embedment-option--active': embedment === 'both' }" @click="embedment = 'both'">
                <span>Заделка с обеих сторон</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
  
      <main class="center" @wheel.passive="onWheelPan">
        <KonvaStage ref="stageRef" @update:stats="onStats" />
        <input ref="fileInputRef" type="file" accept="application/json" @change="onProjectFileSelected" style="display:none" />
        <div
          v-if="showGrid"
          class="grid-overlay"
          :style="{ '--grid-size': GRID_SIZE_CM, '--grid-color': gridColor, opacity: gridOpacity }"
        />
        <!-- Оси координат -->
        <div class="axis axis-x" aria-hidden="true"></div>
        <!-- Подписи осей -->
        <div class="axis-label axis-label-x" aria-hidden="true">X</div>
        <div class="interaction-lock" />
        <div class="bottom-controls">
          <button class="reset-view" @click="zoomOut" title="Отдалить">-</button>
          <button class="reset-view" @click="zoomIn" title="Приблизить">+</button>
          <button class="reset-view" @click="resetView" title="Вернуть к центру">центр</button>
        </div>
      </main>
  
      <aside class="side right">
        <div class="panel">
          <div style="display:flex; gap:8px; margin:8px 0;">
              <button class="rod2-btn" @click="saveProject">сохранить</button>
              <button class="rod2-btn" @click="triggerLoadProject">загрузить</button>
              <button class="rod2-btn" @click="onCalculate" title="Рассчитать">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1" fill="none"/>
                  <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" stroke-width="1"/>
                  <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1"/>
                  <text x="7" y="9" font-size="6" text-anchor="middle" dominant-baseline="middle">+</text>
                  <text x="16" y="9" font-size="6" text-anchor="middle" dominant-baseline="middle">-</text>
                  <text x="7" y="16" font-size="6" text-anchor="middle" dominant-baseline="middle">×</text>
                  <text x="16" y="16" font-size="6" text-anchor="middle" dominant-baseline="middle">=</text>
                </svg>
              </button>
            </div>
          <div class="info">
            <!-- Диагностика модели -->
            <div style="margin-top:12px; font-weight:600;">Статус модели:</div>
            <div class="diag">
              <div class="diag-status" :class="{
                'diag--ok': validation.status === 'ok',
                'diag--warn': validation.status === 'warnings',
                'diag--err': validation.status === 'errors'
              }">
                {{ validation.message || 'нет данных' }}
              </div>
              <ul v-if="validation.errors.length" class="diag-list">
                <li v-for="(e, i) in validation.errors" :key="'e'+i">{{ e }}</li>
              </ul>
              <ul v-else-if="validation.warnings.length" class="diag-list diag-list--warn">
                <li v-for="(w, i) in validation.warnings" :key="'w'+i">{{ w }}</li>
              </ul>
            </div>
            <div style="margin-top:12px; font-weight:600;">Стержни:</div>
            <div class="rod-cards">
              <template v-if="rods.length === 0">
                <div style="opacity:0.7; font-size:13px;">Пока нет стержней — добавьте слева.</div>
              </template>
              <template v-else>
                <template v-for="(r, idx) in rods" :key="r.id">
                  <!-- Карточка узла слева от стержня -->
                  <div v-if="hasNonZeroLoads(idx + 1)" class="node-card">
                    <div class="node-header">Узел {{ idx + 1 }}</div>
                    <div class="node-loads">
                      <div v-for="load in getLoadsForNode(idx + 1)" :key="load.id" class="node-load-item">
                        <div class="load-row">
                          <span>Fx = {{ load.forceX }} qL</span>
                        </div>
                      </div>
                    </div>
                    <div class="node-actions">
                      <button class="node-btn" @click="editLoad(idx + 1)">редактировать</button>
                      <button class="node-btn node-btn--danger" @click="deleteLoad(idx + 1)">удалить</button>
                    </div>
                  </div>
                  
                  <!-- Карточка стержня -->
                  <div class="rod-card2">
                    <div class="rod2-header">Стержень № {{ idx + 1 }}</div>
                    <div class="rod2-grid">
                      <div class="rod2-cell">
                        <div class="rod2-row"><span>L =</span><span class="rod2-value">{{ r.L }}</span><span class="rod2-unit">м</span></div>
                        <div class="rod2-row"><span>A =</span><span class="rod2-value">{{ r.A }}</span><span class="rod2-unit">м²</span></div>
                      </div>
                      <div class="rod2-cell rod2-cell--right">
                        <div class="rod2-row"><span>E =</span><span class="rod2-value">{{ r.E.toExponential() }}</span><span class="rod2-unit">Па</span></div>
                        <div class="rod2-row"><span>[σ] =</span><span class="rod2-value">{{ r.sigma.toExponential() }}</span><span class="rod2-unit">Па</span></div>
                      </div>
                    </div>
                    
                    <!-- Информация о нагрузке q -->
                    <div v-if="getLoadForRod(idx + 1)" class="rod2-load">
                      <div class="load-title">Нагрузка q:</div>
                      <div class="load-values">
                        <div class="load-value">qx = {{ getLoadForRod(idx + 1).forceX }} q</div>
                      </div>
                    </div>
                    
                    <div class="rod2-actions">
                      <button class="rod2-btn" @click="onEditRod(r)">редактировать</button>
                      <button class="rod2-btn rod2-btn--danger" @click="onDeleteRod(r.id)">удалить</button>
                    </div>
                  </div>
                  
                  <!-- Карточка узла справа от стержня -->
                  <div v-if="hasNonZeroLoads(idx + 2)" class="node-card">
                    <div class="node-header">Узел {{ idx + 2 }}</div>
                    <div class="node-loads">
                      <div v-for="load in getLoadsForNode(idx + 2)" :key="load.id" class="node-load-item">
                        <div class="load-row">
                          <span>Fx = {{ load.forceX }} qL</span>
                        </div>
                      </div>
                    </div>
                    <div class="node-actions">
                      <button class="node-btn" @click="editLoad(idx + 2)">редактировать</button>
                      <button class="node-btn node-btn--danger" @click="deleteLoad(idx + 2)">удалить</button>
                    </div>
                  </div>
                  
                  <div class="rod2-arrow" v-if="idx < rods.length - 1" />
                </template>
              </template>
            </div>

            <div style="margin-top:12px; font-weight:600;">Сетка:</div>
            <div class="grid-controls">
              <label class="grid-toggle">
                <input type="checkbox" v-model="showGrid" />
                Показать сетку
              </label>
            </div>
            <div>Фигур: {{ shapesCount }}</div>

            

          </div>
        </div>
      </aside>
      
      <!-- Модальное окно результатов -->
      <ResultsModal 
        :is-visible="showResultsModal"
        :calculation-results="calculationResults"
        :rods="rods"
        :loads="loads"
        :rod-loads="rodLoads"
        :embedment="embedment"
        @close="closeResultsModal"
      />
    </div>
</template>

<style scoped>
/* Макет */
.page {
  display: grid;
  grid-template-columns: 260px 1fr 260px;
  grid-template-rows: 100vh;
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
  max-height: 100vh;
}

.side {
  display: flex;
  overflow-y: auto;
  overflow-x: hidden;
  /* Скрыть полосы прокрутки во всех браузерах */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.side::-webkit-scrollbar { /* Chrome/Safari */
  width: 0;
  height: 0;
}

.panel {
  background: #0f172a;
  color: #e2e8f0;
  border: 1px solid #243047;
  border-radius: 8px;
  padding: 12px;
  width: 100%;
  box-sizing: border-box;
}

/* Карточка добавления стержня */
.rod-card {
  background: #ec6aa0;
  color: #1f1f1f;
  border: 2px solid #b44f7a;
  border-radius: 16px;
  overflow: hidden;
  min-height: 200px; 
}

.rod-header {
  text-align: center;
  font-weight: 600;
  padding: 10px 12px;
  background: rgba(255,255,255,0.15);
  border-bottom: 2px solid rgba(255,255,255,0.45);
}

.rod-grid { display: grid; }
.rod-grid--column {
  grid-template-columns: 1fr;
  gap: 0;
}

.rod-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-top: 2px solid rgba(255,255,255,0.45);
}

.rod-cell--left { border-right: 2px solid rgba(255,255,255,0.45); }
.rod-label { min-width: 28px; }

.rod-input {
  width: 100%;
  border-radius: 6px;
  border: 1px solid #9b3463;
  padding: 6px 8px;
}

.rod-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 12px 12px;
}

.rod-add {
  background: #9b2c63;
  color: #fff;
  border: 1px solid #7e2552;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.rod-clear {
  background: transparent;
  color: #1e293b;
  border: 1px solid #7e2552;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.rod-add:hover { filter: brightness(1.05); }
.rod-clear:hover { background: rgba(255,255,255,0.25); }

.rod-cancel {
  background: transparent;
  color: #ef4444;
  border: 1px solid #ef4444;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.rod-cancel:hover {
  background: #ef4444;
  color: #fff;
}

.center {
  background: #0b1020;
  border: 1px solid #223052;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.reset-view {
  background: #9b2c63;
  color: #fff;
  border: 1px solid #7e2552;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.reset-view:hover { filter: brightness(1.05); }

.bottom-controls {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  gap: 8px;
}

.rods-list {
  margin: 6px 0 0;
  padding-left: 16px;
}

.rods-list li { margin: 2px 0; }


/* Сетка поверх Konva */
.grid-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* Используем две повторяющиеся линейные градиентные подложки — вертикальные и горизонтальные линии */
  background-image:
    repeating-linear-gradient(to right,
      var(--grid-color) 0,
      var(--grid-color) 1px,
      transparent 1px,
      transparent var(--grid-size)
    ),
    repeating-linear-gradient(to bottom,
      var(--grid-color) 0,
      var(--grid-color) 1px,
      transparent 1px,
      transparent var(--grid-size)
    );
}

/* Оси координат через центр (ось Y смещается на 1см inline-стилем) */
.axis {
  position: absolute;
  pointer-events: none;
  background: #38bdf8; /* голубая линия */
  opacity: 0.6;
}

.axis-x {
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  transform: translateY(-0.5px);
}

/* Подписи осей */
.axis-label {
  position: absolute;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(0,0,0,0.6);
}

.axis-label-x {
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}

/* Невидимый слой, блокирующий взаимодействия (перетаскивание) */
.interaction-lock {
  position: absolute;
  inset: 0;
  pointer-events: all;
  background: transparent;
}

.grid-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}

/* Диагностика */
.diag { margin-top: 6px; }
.diag-status {
  margin: 6px 0;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
}
.diag--ok { border: 1px solid #16a34a; color: #fff; background: rgba(22,163,74,0.25); }
.diag--warn { border: 1px solid #f59e0b; color: #7c2d12; background: rgba(245,158,11,0.25); }
.diag--err { border: 1px solid #ef4444; color: #7f1d1d; background: rgba(239,68,68,0.25); }
.diag-list { margin: 0; padding-left: 18px; font-size: 12px; }
.diag-list--warn { color: #7c2d12; }

.grid-row {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 8px;
}

.grid-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Карточка добавления нагрузки */
.load-card {
  background: #ec6aa0; /* как у .rod-card */
  color: #1f1f1f;
  border: 2px solid #b44f7a;
  border-radius: 16px;
  overflow: hidden;
  margin-top: 8px;
  min-height: 200px; /* такая же высота как у .rod-card */
}

.load-header {
  text-align: center;
  font-weight: 500;
  padding: 10px 12px;
  background: rgba(255,255,255,0.15);
  border-bottom: 2px solid rgba(255,255,255,0.45);
  font-size: 16px;
}

.load-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
}

.load-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.load-label {
  min-width: 80px;
  font-size: 14px;
}

.load-input {
  flex: 1;
  border-radius: 6px;
  border: 1px solid #9b3463;
  padding: 6px 8px;
  background: #243047;
  color: #fff;
  font-size: 14px;
}

.load-unit {
  min-width: 24px;
  font-size: 12px;
  font-weight: 600;
  color: #1f1f1f;
}

.load-footer {
  display: flex;
  justify-content: flex-end;
  padding: 3px 12px 12px;
}

.load-add {
  background: #9b2c63;
  color: #fff;
  border: 1px solid #7e2552;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 14px;
}

.load-add:hover {
  filter: brightness(1.05);
}

.load-edit-buttons {
  display: flex;
  gap: 8px;
}

.load-cancel {
  background: transparent;
  color: #ef4444;
  border: 1px solid #ef4444;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 14px;
}

.load-cancel:hover {
  background: #ef4444;
  color: #fff;
}

/* Карточки стержней справа */
.rod-cards { margin-top: 8px; }

.rod2-arrow {
  width: 0; height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 14px solid #b44f7a; /* как бордер у левой карточки */
  margin: 6px auto;
  filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));
}

.rod2-header {
  text-align: center;
  font-weight: 600;
  padding: 10px 12px;
  background: rgba(255,255,255,0.15); /* как .rod-header */
  border-bottom: 2px solid rgba(255,255,255,0.45);
  border-radius: 16px 16px 0 0;
}

.rod2-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: transparent;
  border-top: 2px solid rgba(255,255,255,0.45);
  border-bottom: 2px solid rgba(255,255,255,0.45);
}

.rod2-cell {
  padding: 10px 12px;
}

.rod2-cell--right { border-left: 2px solid rgba(255,255,255,0.45); }

.rod2-row {
  margin: 8px 0;
}

.rod2-value {
  font-weight: 60000;
}

.rod2-unit {
  display: inline-block;
  color: #1f1f1f;
}

.rod2-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 8px 12px 12px;
}

.rod2-btn {
  background: #9b2c63; /* как .rod-add */
  color: #fff;
  border: 1px solid #7e2552;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.rod2-btn--danger {
  background: transparent;
  color: #1e293b;
  border: 1px solid #7e2552; /* как .rod-clear */
}

.rod-card2 {
  background: #ec6aa0; /* как .rod-card */
  color: #1f1f1f;
  border: 2px solid #b44f7a;
  border-radius: 16px;
  overflow: hidden;
  margin-top: 10px;
}

/* Стили для отображения нагрузки в карточках стержней */
.rod2-load {
  background: rgba(255,255,255,0.1);
  border-top: 2px solid rgba(255,255,255,0.45);
  padding: 8px 12px;
}

/* Стили для карточек узлов */
.node-card {
  background: #8b5cf6; /* фиолетовый фон */
  color: #ffffff;
  border: 2px solid #7c3aed;
  border-radius: 12px;
  overflow: hidden;
  margin: 8px 0;
  transition: opacity 0.3s ease;
}

.node-card--hidden {
  opacity: 0;
  pointer-events: none;
  height: 0;
  margin: 0;
  overflow: hidden;
}

.node-header {
  text-align: center;
  font-weight: 600;
  padding: 8px 10px;
  background: rgba(255,255,255,0.15);
  border-bottom: 2px solid rgba(255,255,255,0.45);
  font-size: 14px;
}

.node-loads {
  padding: 8px 12px;
}

.node-load-item {
  margin-bottom: 6px;
}

.load-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}

.load-row span {
  background: rgba(255,255,255,0.2);
  padding: 2px 6px;
  border-radius: 4px;
  flex: 1;
  text-align: center;
}

/* Стили для кнопок в карточках узлов */
.node-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 6px 8px 8px;
}

.node-btn {
  background: #7c3aed;
  color: #fff;
  border: 1px solid #6d28d9;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 11px;
}

.node-btn--danger {
  background: transparent;
  color: #1e293b;
  border-color: 6d28d9;
}

.node-btn:hover {
  filter: brightness(1.05);
}



.load-title {
  font-weight: 600;
  font-size: 12px;
  margin-bottom: 6px;
  color: #1f1f1f;
}

.load-values {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.load-value {
  font-size: 11px;
  color: #1f1f1f;
  background: rgba(255,255,255,0.2);
  padding: 2px 6px;
  border-radius: 4px;
}

/* Стили для блока заделки */
.embedment-card {
  background: #b44f7a; /* розовый фон как у других карточек */
  color: #ffffff;
  border: 2px solid #9b2c63;
  border-radius: 12px;
  overflow: hidden;
  margin: 12px 0;
}

.embedment-header {
  text-align: center;
  font-weight: 600;
  padding: 10px 12px;
  background: rgba(255,255,255,0.15);
  border-bottom: 2px solid rgba(255,255,255,0.45);
  font-size: 14px;
}

.embedment-options {
  padding: 8px;
}

.embedment-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  margin: 4px 0;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.embedment-option:hover {
  background: rgba(255,255,255,0.2);
}

.embedment-option--active {
  background: rgba(255,255,255,0.25);
  border: 1px solid rgba(255,255,255,0.5);
}

</style>






