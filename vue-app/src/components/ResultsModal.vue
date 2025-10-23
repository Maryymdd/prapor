<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Результаты расчёта</h2>
        <button class="close-btn" @click="closeModal">×</button>
      </div>
      
      <div class="modal-body">
        <!-- Таблица перемещений узлов -->
        <div class="results-section">
          <h3>Перемещения узлов</h3>
          <div class="table-container">
            <table class="results-table">
              <thead>
                <tr>
                  <th>Узел</th>
                  <th>Перемещение u (м)</th>
                  <th>Нормализованный коэффициент</th>
                  <th>Формула</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="result in normalizedResults" :key="result.node">
                  <td>{{ result.node }}</td>
                  <td>{{ result.displacement.toExponential(3) }}</td>
                  <td>{{ result.coefficient.toFixed(6) }}</td>
                  <td class="formula-cell">{{ result.formula }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- График перемещений -->
        <div class="results-section">
          <h3>График перемещений</h3>
          <div class="chart-container">
            <canvas ref="displacementChart" width="600" height="200"></canvas>
          </div>
        </div>

        <!-- Таблица продольных сил Nx -->
        <div class="results-section">
          <h3>Продольные силы Nx</h3>
          <div class="table-container">
            <table class="results-table">
              <thead>
                <tr>
                  <th>Стержень</th>
                  <th>Продольная сила Nx (Н)</th>
                  <th>Деформация ε</th>
                  <th>Длина L (м)</th>
                  <th>Площадь A (м²)</th>
                  <th>Модуль E (Па)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(force, index) in longitudinalForces" :key="index">
                  <td>{{ force.rodNumber }}</td>
                  <td>{{ force.force.toExponential(3) }}</td>
                  <td>{{ force.strain.toExponential(3) }}</td>
                  <td>{{ force.length }}</td>
                  <td>{{ force.area.toExponential(3) }}</td>
                  <td>{{ force.modulus.toExponential(3) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Таблица нормальных напряжений Ox -->
        <div class="results-section">
          <h3>Нормальные напряжения Ox</h3>
          <div class="table-container">
            <table class="results-table">
              <thead>
                <tr>
                  <th>Стержень</th>
                  <th>Напряжение Ox (Па)</th>
                  <th>Деформация ε</th>
                  <th>Допустимое [σ] (Па)</th>
                  <th>Запас прочности</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(stress, index) in normalStresses" :key="index">
                  <td>{{ stress.rodNumber }}</td>
                  <td>{{ stress.stress.toExponential(3) }}</td>
                  <td>{{ stress.strain.toExponential(3) }}</td>
                  <td>{{ stress.allowable.toExponential(3) }}</td>
                  <td>{{ stress.safetyFactor.toFixed(2) }}</td>
                  <td :class="stress.status === 'OK' ? 'status-ok' : 'status-danger'">
                    {{ stress.status }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- График напряжений -->
        <div class="results-section">
          <h3>График напряжений</h3>
          <div class="chart-container">
            <canvas ref="stressChart" width="600" height="200"></canvas>
          </div>
        </div>

        <!-- График продольных сил -->
        <div class="results-section">
          <h3>График продольных сил Nx</h3>
          <div class="chart-container">
            <canvas ref="forceChart" width="600" height="200"></canvas>
          </div>
        </div>

        <!-- Эпюры на конструкции -->
        <div class="results-section">
          <h3>Эпюры напряжённо-деформированного состояния</h3>
          <div class="chart-container">
            <canvas ref="epureChart" width="800" height="500"></canvas>
          </div>
        </div>

        <!-- Получение результатов в конкретном сечении -->
        <div class="results-section">
          <h3>Результаты в конкретном сечении</h3>
          <div class="section-selector">
            <div class="selector-row">
              <label>Стержень:</label>
              <select v-model="selectedRod" @change="updateSectionResults">
                <option v-for="(rod, index) in rods" :key="index" :value="index + 1">
                  Стержень {{ index + 1 }}
                </option>
              </select>
            </div>
            <div class="selector-row">
              <label>Локальная координата (м):</label>
              <input 
                type="number" 
                v-model.number="selectedCoordinate" 
                :min="0" 
                :max="getRodLength(selectedRod)"
                step="0.1"
                @input="updateSectionResults"
              />
            </div>
          </div>
          <div v-if="sectionResults" class="section-results">
            <div class="result-item">
              <span class="result-label">Перемещение Ux:</span>
              <span class="result-value">{{ sectionResults.displacement.toExponential(3) }} м</span>
            </div>
            <div class="result-item">
              <span class="result-label">Деформация ε:</span>
              <span class="result-value">{{ sectionResults.strain.toExponential(3) }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Напряжение Ox:</span>
              <span class="result-value">{{ sectionResults.stress.toExponential(3) }} Па</span>
            </div>
            <div class="result-item">
              <span class="result-label">Продольная сила Nx:</span>
              <span class="result-value">{{ sectionResults.force.toExponential(3) }} Н</span>
            </div>
            <div class="result-item">
              <span class="result-label">Запас прочности:</span>
              <span class="result-value">{{ sectionResults.safetyFactor.toFixed(2) }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Статус:</span>
              <span class="result-value" :class="sectionResults.status === 'OK' ? 'status-ok' : 'status-danger'">
                {{ sectionResults.status }}
              </span>
            </div>
          </div>
        </div>

        <!-- Сводная информация -->
        <div class="results-section">
          <h3>Сводная информация</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">Количество стержней:</span>
              <span class="summary-value">{{ rodsCount }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Количество узлов:</span>
              <span class="summary-value">{{ nodesCount }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Максимальное перемещение:</span>
              <span class="summary-value">{{ maxDisplacement.toExponential(3) }} м</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Максимальное напряжение:</span>
              <span class="summary-value">{{ maxStress.toExponential(3) }} Па</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="export-btn" @click="exportResults">Экспорт результатов</button>
        <button class="close-modal-btn" @click="closeModal">Закрыть</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  calculationResults: {
    type: Object,
    default: () => ({})
  },
  rods: {
    type: Array,
    default: () => []
  },
  loads: {
    type: Array,
    default: () => []
  },
  rodLoads: {
    type: Array,
    default: () => []
  },
  embedment: {
    type: String,
    default: 'left'
  }
})

const emit = defineEmits(['close'])

const displacementChart = ref(null)
const stressChart = ref(null)
const forceChart = ref(null)
const epureChart = ref(null)

// Реактивные переменные для выбора сечения
const selectedRod = ref(1)
const selectedCoordinate = ref(0)
const sectionResults = ref(null)

// Вычисляемые свойства для результатов
const normalizedResults = computed(() => {
  return props.calculationResults.normalizedDisplacements || []
})

const stressResults = computed(() => {
  const results = []
  const displacements = props.calculationResults.displacements || []
  
  props.rods.forEach((rod, index) => {
    const L = Number(rod.L)
    const A = Number(rod.A)
    const E = Number(rod.E)
    const sigma = Number(rod.sigma)
    
    // Напряжение = E * деформация = E * (u2 - u1) / L
    const u1 = displacements[index] || 0
    const u2 = displacements[index + 1] || 0
    const strain = (u2 - u1) / L
    const stress = E * strain
    
    const safetyFactor = sigma / Math.abs(stress)
    const status = Math.abs(stress) <= sigma ? 'OK' : 'ПРЕВЫШЕНО'
    
    results.push({
      stress: Math.abs(stress),
      allowable: sigma,
      safetyFactor: safetyFactor,
      status: status
    })
  })
  
  return results
})

// Расчёт продольных сил Nx в каждом сечении стержней
const longitudinalForces = computed(() => {
  const results = []
  const displacements = props.calculationResults.displacements || []
  
  props.rods.forEach((rod, index) => {
    const L = Number(rod.L)
    const A = Number(rod.A)
    const E = Number(rod.E)
    
    // Продольная сила Nx = E * A * деформация = E * A * (u2 - u1) / L
    const u1 = displacements[index] || 0
    const u2 = displacements[index + 1] || 0
    const strain = (u2 - u1) / L
    const Nx = E * A * strain
    
    results.push({
      rodNumber: index + 1,
      force: Nx,
      strain: strain,
      length: L,
      area: A,
      modulus: E
    })
  })
  
  return results
})

// Расчёт нормальных напряжений Ox в каждом сечении
const normalStresses = computed(() => {
  const results = []
  const displacements = props.calculationResults.displacements || []
  
  props.rods.forEach((rod, index) => {
    const L = Number(rod.L)
    const A = Number(rod.A)
    const E = Number(rod.E)
    const sigma = Number(rod.sigma)
    
    // Нормальное напряжение Ox = E * деформация = E * (u2 - u1) / L
    const u1 = displacements[index] || 0
    const u2 = displacements[index + 1] || 0
    const strain = (u2 - u1) / L
    const Ox = E * strain
    
    const safetyFactor = sigma / Math.abs(Ox)
    const status = Math.abs(Ox) <= sigma ? 'OK' : 'ПРЕВЫШЕНО'
    
    results.push({
      rodNumber: index + 1,
      stress: Ox,
      strain: strain,
      allowable: sigma,
      safetyFactor: safetyFactor,
      status: status
    })
  })
  
  return results
})

// Получение результатов в конкретном сечении
const getSectionResults = (rodNumber, localCoordinate) => {
  const rodIndex = rodNumber - 1
  if (rodIndex < 0 || rodIndex >= props.rods.length) return null
  
  const rod = props.rods[rodIndex]
  const L = Number(rod.L)
  const A = Number(rod.A)
  const E = Number(rod.E)
  const sigma = Number(rod.sigma)
  
  const displacements = props.calculationResults.displacements || []
  const u1 = displacements[rodIndex] || 0
  const u2 = displacements[rodIndex + 1] || 0
  
  // Линейная интерполяция перемещения в сечении
  const xi = localCoordinate / L // безразмерная координата
  const ux = u1 + (u2 - u1) * xi
  
  // Деформация постоянна по длине стержня
  const strain = (u2 - u1) / L
  
  // Напряжение и сила в сечении
  const Ox = E * strain
  const Nx = E * A * strain
  
  return {
    rodNumber,
    localCoordinate,
    displacement: ux,
    strain: strain,
    stress: Ox,
    force: Nx,
    allowable: sigma,
    safetyFactor: sigma / Math.abs(Ox),
    status: Math.abs(Ox) <= sigma ? 'OK' : 'ПРЕВЫШЕНО'
  }
}

const rodsCount = computed(() => props.rods.length)
const nodesCount = computed(() => props.rods.length + 1)

const maxDisplacement = computed(() => {
  const displacements = props.calculationResults.displacements || []
  return Math.max(...displacements.map(Math.abs), 0)
})

const maxStress = computed(() => {
  return Math.max(...normalStresses.value.map(s => Math.abs(s.stress)), 0)
})

// Функции для работы с сечениями
const getRodLength = (rodNumber) => {
  const rodIndex = rodNumber - 1
  if (rodIndex >= 0 && rodIndex < props.rods.length) {
    return Number(props.rods[rodIndex].L)
  }
  return 0
}

const updateSectionResults = () => {
  if (selectedRod.value && selectedCoordinate.value !== null) {
    sectionResults.value = getSectionResults(selectedRod.value, selectedCoordinate.value)
  }
}

// Функции для работы с графиками
const drawDisplacementChart = () => {
  const canvas = displacementChart.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  
  // Очистка canvas
  ctx.clearRect(0, 0, width, height)
  
  // Настройка стилей
  ctx.strokeStyle = '#3b82f6'
  ctx.fillStyle = '#3b82f6'
  ctx.lineWidth = 2
  
  const displacements = props.calculationResults.displacements || []
  if (displacements.length === 0) return
  
  // Находим масштаб
  const maxDisp = Math.max(...displacements.map(Math.abs))
  const scaleY = maxDisp > 0 ? (height - 40) / (2 * maxDisp) : 1
  const scaleX = (width - 40) / (displacements.length - 1)
  
  // Рисуем оси
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(20, height / 2)
  ctx.lineTo(width - 20, height / 2)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(20, 20)
  ctx.lineTo(20, height - 20)
  ctx.stroke()
  
  // Рисуем график перемещений
  ctx.strokeStyle = '#3b82f6'
  ctx.fillStyle = '#3b82f6'
  ctx.lineWidth = 2
  
  ctx.beginPath()
  displacements.forEach((disp, index) => {
    const x = 20 + index * scaleX
    const y = height / 2 - disp * scaleY
    
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
    
    // Рисуем точки
    ctx.fillRect(x - 2, y - 2, 4, 4)
  })
  ctx.stroke()
  
  // Подписи
  ctx.fillStyle = '#64748b'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('Перемещения узлов', width / 2, 15)
  
  ctx.textAlign = 'right'
  ctx.save()
  ctx.translate(15, height / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('u (м)', 0, 0)
  ctx.restore()
}

const drawStressChart = () => {
  const canvas = stressChart.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  
  // Очистка canvas
  ctx.clearRect(0, 0, width, height)
  
  const stresses = normalStresses.value
  if (stresses.length === 0) return
  
  // Строим график с локальными координатами
  let totalLength = 0
  const rodLengths = props.rods.map(rod => Number(rod.L))
  const totalRodLength = rodLengths.reduce((sum, len) => sum + len, 0)
  
  // Находим масштаб
  const maxStress = Math.max(...stresses.map(s => Math.abs(s.stress)))
  const scaleY = maxStress > 0 ? (height - 40) / (2 * maxStress) : 1
  const scaleX = (width - 40) / totalRodLength
  
  // Рисуем оси
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(20, height / 2)
  ctx.lineTo(width - 20, height / 2)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(20, 20)
  ctx.lineTo(20, height - 20)
  ctx.stroke()
  
  // Рисуем график напряжений по длине
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2
  
  let currentX = 20
  stresses.forEach((stress, index) => {
    const rodLength = rodLengths[index]
    const rodWidth = rodLength * scaleX
    
    // Напряжение постоянно по длине стержня
    const stressY = height / 2 - stress.stress * scaleY
    
    // Рисуем горизонтальную линию напряжения
    ctx.beginPath()
    ctx.moveTo(currentX, stressY)
    ctx.lineTo(currentX + rodWidth, stressY)
    ctx.stroke()
    
    // Подпись номера стержня
    ctx.fillStyle = '#64748b'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`${index + 1}`, currentX + rodWidth / 2, height - 5)
    
    currentX += rodWidth
  })
  
  // Подписи
  ctx.fillStyle = '#64748b'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('Напряжения Ox по длине конструкции', width / 2, 15)
  
  ctx.textAlign = 'right'
  ctx.save()
  ctx.translate(15, height / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Ox (Па)', 0, 0)
  ctx.restore()
}

const drawForceChart = () => {
  const canvas = forceChart.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  
  // Очистка canvas
  ctx.clearRect(0, 0, width, height)
  
  const forces = longitudinalForces.value
  if (forces.length === 0) return
  
  // Строим график с локальными координатами
  const rodLengths = props.rods.map(rod => Number(rod.L))
  const totalRodLength = rodLengths.reduce((sum, len) => sum + len, 0)
  
  // Находим масштаб
  const maxForce = Math.max(...forces.map(f => Math.abs(f.force)))
  const scaleY = maxForce > 0 ? (height - 40) / (2 * maxForce) : 1
  const scaleX = (width - 40) / totalRodLength
  
  // Рисуем оси
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(20, height / 2)
  ctx.lineTo(width - 20, height / 2)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(20, 20)
  ctx.lineTo(20, height - 20)
  ctx.stroke()
  
  // Рисуем график сил по длине
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2
  
  let currentX = 20
  forces.forEach((force, index) => {
    const rodLength = rodLengths[index]
    const rodWidth = rodLength * scaleX
    
    // Сила постоянна по длине стержня
    const forceY = height / 2 - force.force * scaleY
    
    // Рисуем горизонтальную линию силы
    ctx.beginPath()
    ctx.moveTo(currentX, forceY)
    ctx.lineTo(currentX + rodWidth, forceY)
    ctx.stroke()
    
    // Подпись номера стержня
    ctx.fillStyle = '#64748b'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`${index + 1}`, currentX + rodWidth / 2, height - 5)
    
    currentX += rodWidth
  })
  
  // Подписи
  ctx.fillStyle = '#64748b'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('Продольные силы Nx по длине конструкции', width / 2, 15)
  
  ctx.textAlign = 'right'
  ctx.save()
  ctx.translate(15, height / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Nx (Н)', 0, 0)
  ctx.restore()
}

const drawEpureChart = () => {
  const canvas = epureChart.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  
  // Очистка canvas
  ctx.clearRect(0, 0, width, height)
  
  const displacements = props.calculationResults.displacements || []
  const stresses = normalStresses.value
  const forces = longitudinalForces.value
  
  if (displacements.length === 0) return
  
  // Разделяем canvas на секции: конструкция сверху, эпюры снизу
  const constructionHeight = 60
  const epureHeight = (height - constructionHeight - 20) / 3 // 3 эпюры
  const margin = 20
  
  // Строим эпюры на конструкции
  const rodLengths = props.rods.map(rod => Number(rod.L))
  const totalRodLength = rodLengths.reduce((sum, len) => sum + len, 0)
  
  // Масштабы для эпюр
  const maxDisp = Math.max(...displacements.map(Math.abs))
  const maxStress = Math.max(...stresses.map(s => Math.abs(s.stress)))
  const maxForce = Math.max(...forces.map(f => Math.abs(f.force)))
  
  const scaleX = (width - 2 * margin) / totalRodLength
  
  // Рисуем конструкцию сверху
  const constructionY = margin + constructionHeight / 2
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(margin, constructionY)
  ctx.lineTo(width - margin, constructionY)
  ctx.stroke()
  
  // Рисуем узлы и подписи стержней
  ctx.fillStyle = '#64748b'
  let currentX = margin
  displacements.forEach((disp, index) => {
    // Узел
    ctx.beginPath()
    ctx.arc(currentX, constructionY, 4, 0, 2 * Math.PI)
    ctx.fill()
    
    // Подпись узла
    ctx.fillStyle = '#64748b'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`${index + 1}`, currentX, constructionY - 15)
    
    // Подпись стержня
    if (index < displacements.length - 1) {
      const rodCenterX = currentX + (rodLengths[index] * scaleX) / 2
      ctx.fillText(`(${index + 1})`, rodCenterX, constructionY + 20)
      currentX += rodLengths[index] * scaleX
    }
  })
  
  // Рисуем заделки и опоры
  ctx.fillStyle = '#64748b'
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 2
  
  // Определяем тип заделки из props
  const embedmentType = props.embedment || 'left'
  
  if (embedmentType === 'left') {
    // Левая заделка
    ctx.beginPath()
    ctx.moveTo(margin, constructionY - 10)
    ctx.lineTo(margin, constructionY + 10)
    ctx.lineTo(margin + 15, constructionY + 10)
    ctx.lineTo(margin + 15, constructionY - 10)
    ctx.stroke()
    
    // Диагональные линии заделки
    for (let i = 0; i < 3; i++) {
      const y = constructionY - 8 + i * 4
      ctx.beginPath()
      ctx.moveTo(margin + 2, y)
      ctx.lineTo(margin + 13, y + 2)
      ctx.stroke()
    }
  } else if (embedmentType === 'right') {
    // Правая заделка
    ctx.beginPath()
    ctx.moveTo(width - margin, constructionY - 10)
    ctx.lineTo(width - margin, constructionY + 10)
    ctx.lineTo(width - margin - 15, constructionY + 10)
    ctx.lineTo(width - margin - 15, constructionY - 10)
    ctx.stroke()
    
    // Диагональные линии заделки
    for (let i = 0; i < 3; i++) {
      const y = constructionY - 8 + i * 4
      ctx.beginPath()
      ctx.moveTo(width - margin - 2, y)
      ctx.lineTo(width - margin - 13, y + 2)
      ctx.stroke()
    }
  } else if (embedmentType === 'both') {
    // Заделки с обеих сторон
    // Левая заделка
    ctx.beginPath()
    ctx.moveTo(margin, constructionY - 10)
    ctx.lineTo(margin, constructionY + 10)
    ctx.lineTo(margin + 15, constructionY + 10)
    ctx.lineTo(margin + 15, constructionY - 10)
    ctx.stroke()
    
    // Правая заделка
    ctx.beginPath()
    ctx.moveTo(width - margin, constructionY - 10)
    ctx.lineTo(width - margin, constructionY + 10)
    ctx.lineTo(width - margin - 15, constructionY + 10)
    ctx.lineTo(width - margin - 15, constructionY - 10)
    ctx.stroke()
    
    // Диагональные линии заделок
    for (let i = 0; i < 3; i++) {
      const y = constructionY - 8 + i * 4
      // Левая заделка
      ctx.beginPath()
      ctx.moveTo(margin + 2, y)
      ctx.lineTo(margin + 13, y + 2)
      ctx.stroke()
      // Правая заделка
      ctx.beginPath()
      ctx.moveTo(width - margin - 2, y)
      ctx.lineTo(width - margin - 13, y + 2)
      ctx.stroke()
    }
  }
  
  // Рисуем нагрузки
  ctx.fillStyle = '#10b981'
  ctx.strokeStyle = '#10b981'
  ctx.font = '12px Arial'
  ctx.lineWidth = 2
  
  // Сосредоточенные нагрузки на узлах
  props.loads.forEach(load => {
    const nodeIndex = load.nodeNumber - 1
    if (nodeIndex >= 0 && nodeIndex < displacements.length) {
      const nodeX = margin + rodLengths.slice(0, nodeIndex).reduce((sum, len) => sum + len * scaleX, 0)
      const forceValue = Number(load.forceX)
      
      if (forceValue !== 0) {
        // Стрелка нагрузки
        const arrowLength = 20
        const arrowY = constructionY - 15
        
        if (forceValue > 0) {
          // Нагрузка вправо
          ctx.beginPath()
          ctx.moveTo(nodeX, arrowY)
          ctx.lineTo(nodeX + arrowLength, arrowY)
          ctx.stroke()
          
          // Наконечник стрелки
          ctx.beginPath()
          ctx.moveTo(nodeX + arrowLength, arrowY)
          ctx.lineTo(nodeX + arrowLength - 5, arrowY - 3)
          ctx.lineTo(nodeX + arrowLength - 5, arrowY + 3)
          ctx.closePath()
          ctx.fill()
          
          ctx.fillText(`${forceValue}qL`, nodeX + arrowLength + 5, arrowY + 4)
        } else {
          // Нагрузка влево
          ctx.beginPath()
          ctx.moveTo(nodeX, arrowY)
          ctx.lineTo(nodeX - arrowLength, arrowY)
          ctx.stroke()
          
          // Наконечник стрелки
          ctx.beginPath()
          ctx.moveTo(nodeX - arrowLength, arrowY)
          ctx.lineTo(nodeX - arrowLength + 5, arrowY - 3)
          ctx.lineTo(nodeX - arrowLength + 5, arrowY + 3)
          ctx.closePath()
          ctx.fill()
          
          ctx.fillText(`${forceValue}qL`, nodeX - arrowLength - 30, arrowY + 4)
        }
      }
    }
  })
  
  // Распределённые нагрузки на стержнях
  props.rodLoads.forEach(load => {
    const rodIndex = load.rodNumber - 1
    if (rodIndex >= 0 && rodIndex < rodLengths.length) {
      const rodStartX = margin + rodLengths.slice(0, rodIndex).reduce((sum, len) => sum + len * scaleX, 0)
      const rodEndX = rodStartX + rodLengths[rodIndex] * scaleX
      const rodCenterX = (rodStartX + rodEndX) / 2
      const forceValue = Number(load.forceX)
      
      if (forceValue !== 0) {
        // Рисуем стрелки распределённой нагрузки
        const arrowCount = Math.max(3, Math.floor(rodLengths[rodIndex] * scaleX / 30))
        const arrowSpacing = rodLengths[rodIndex] * scaleX / (arrowCount - 1)
        
        for (let i = 0; i < arrowCount; i++) {
          const arrowX = rodStartX + i * arrowSpacing
          const arrowY = constructionY - 25
          
          if (forceValue > 0) {
            // Нагрузка вправо
            ctx.beginPath()
            ctx.moveTo(arrowX, arrowY)
            ctx.lineTo(arrowX + 15, arrowY)
            ctx.stroke()
            
            // Наконечник стрелки
            ctx.beginPath()
            ctx.moveTo(arrowX + 15, arrowY)
            ctx.lineTo(arrowX + 10, arrowY - 2)
            ctx.lineTo(arrowX + 10, arrowY + 2)
            ctx.closePath()
            ctx.fill()
          } else {
            // Нагрузка влево
            ctx.beginPath()
            ctx.moveTo(arrowX, arrowY)
            ctx.lineTo(arrowX - 15, arrowY)
            ctx.stroke()
            
            // Наконечник стрелки
            ctx.beginPath()
            ctx.moveTo(arrowX - 15, arrowY)
            ctx.lineTo(arrowX - 10, arrowY - 2)
            ctx.lineTo(arrowX - 10, arrowY + 2)
            ctx.closePath()
            ctx.fill()
          }
        }
        
        // Подпись нагрузки
        ctx.fillText(`${forceValue}q`, rodCenterX, constructionY - 35)
      }
    }
  })
  
  // Рисуем эпюру продольных сил Nx
  const nxY = constructionHeight + margin + epureHeight / 2
  drawEpure(ctx, forces.map(f => ({ value: f.force })), rodLengths, margin, nxY, epureHeight, scaleX, maxForce, '#ef4444', 'Nx / [qL]')
  
  // Рисуем эпюру напряжений σx
  const sigmaY = constructionHeight + margin + epureHeight + epureHeight / 2
  drawEpure(ctx, stresses.map(s => ({ value: s.stress })), rodLengths, margin, sigmaY, epureHeight, scaleX, maxStress, '#f59e0b', 'σx / [qL/b²]')
  
  // Рисуем эпюру перемещений ux
  const uxY = constructionHeight + margin + 2 * epureHeight + epureHeight / 2
  drawDisplacementEpure(ctx, displacements, rodLengths, margin, uxY, epureHeight, scaleX, maxDisp, '#3b82f6', 'ux / [qL/(Eb²)]')
}

const drawEpure = (ctx, values, rodLengths, startX, centerY, height, scaleX, maxValue, color, label) => {
  // Нулевая линия
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(startX, centerY)
  ctx.lineTo(startX + rodLengths.reduce((sum, len) => sum + len * scaleX, 0), centerY)
  ctx.stroke()
  
  // Масштаб для значений
  const scaleY = maxValue > 0 ? (height / 2 - 10) / maxValue : 1
  
  // Рисуем эпюру
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  
  let currentX = startX
  values.forEach((value, index) => {
    const rodLength = rodLengths[index]
    const rodWidth = rodLength * scaleX
    
    // Значение постоянно по длине стержня
    const valueY = centerY - value.value * scaleY
    
    // Рисуем горизонтальную линию
    ctx.beginPath()
    ctx.moveTo(currentX, valueY)
    ctx.lineTo(currentX + rodWidth, valueY)
    ctx.stroke()
    
    // Заливаем область под эпюрой
    ctx.fillStyle = color + '30' // полупрозрачность
    ctx.fillRect(currentX, Math.min(valueY, centerY), rodWidth, Math.abs(valueY - centerY))
    ctx.fillStyle = color
    
    // Подпись значения
    ctx.fillStyle = '#64748b'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(value.value.toExponential(2), currentX + rodWidth / 2, valueY - 5)
    ctx.fillStyle = color
    
    currentX += rodWidth
  })
  
  // Подпись эпюры
  ctx.fillStyle = '#64748b'
  ctx.font = '12px Arial'
  ctx.textAlign = 'left'
  ctx.fillText(label, startX, centerY - height / 2 + 15)
}

const drawDisplacementEpure = (ctx, displacements, rodLengths, startX, centerY, height, scaleX, maxValue, color, label) => {
  // Нулевая линия
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(startX, centerY)
  ctx.lineTo(startX + rodLengths.reduce((sum, len) => sum + len * scaleX, 0), centerY)
  ctx.stroke()
  
  // Масштаб для значений
  const scaleY = maxValue > 0 ? (height / 2 - 10) / maxValue : 1
  
  // Рисуем эпюру перемещений (линейная интерполяция между узлами)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  
  let currentX = startX
  displacements.forEach((disp, index) => {
    const dispY = centerY - disp * scaleY
    
    // Точка перемещения
    ctx.beginPath()
    ctx.arc(currentX, dispY, 3, 0, 2 * Math.PI)
    ctx.fill()
    
    // Подпись значения
    ctx.fillStyle = '#64748b'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(disp.toExponential(2), currentX, dispY - 8)
    ctx.fillStyle = color
    
    // Линия к следующему узлу
    if (index < displacements.length - 1) {
      const nextDisp = displacements[index + 1]
      const nextX = currentX + rodLengths[index] * scaleX
      const nextDispY = centerY - nextDisp * scaleY
      
      ctx.beginPath()
      ctx.moveTo(currentX, dispY)
      ctx.lineTo(nextX, nextDispY)
      ctx.stroke()
      
      currentX = nextX
    }
  })
  
  // Подпись эпюры
  ctx.fillStyle = '#64748b'
  ctx.font = '12px Arial'
  ctx.textAlign = 'left'
  ctx.fillText(label, startX, centerY - height / 2 + 15)
}

const closeModal = () => {
  emit('close')
}

const exportResults = () => {
  const results = {
    timestamp: new Date().toISOString(),
    model: {
      rods: props.rods,
      loads: props.loads,
      rodLoads: props.rodLoads
    },
    calculationResults: {
      displacements: props.calculationResults.displacements,
      normalizedDisplacements: normalizedResults.value,
      longitudinalForces: longitudinalForces.value,
      normalStresses: normalStresses.value,
      stiffnessMatrix: props.calculationResults.stiffnessMatrix,
      forceVector: props.calculationResults.forceVector
    },
    summary: {
      rodsCount: rodsCount.value,
      nodesCount: nodesCount.value,
      maxDisplacement: maxDisplacement.value,
      maxStress: maxStress.value,
      maxForce: Math.max(...longitudinalForces.value.map(f => Math.abs(f.force)), 0)
    },
    report: generateReport()
  }
  
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `calculation-report-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`
  document.body.appendChild(a)
  a.click()
  URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

const generateReport = () => {
  const report = []
  report.push('ОТЧЁТ ПО РЕШЕНИЮ ЗАДАЧИ')
  report.push('='.repeat(50))
  report.push(`Дата расчёта: ${new Date().toLocaleString('ru-RU')}`)
  report.push('')
  
  report.push('ИСХОДНЫЕ ДАННЫЕ:')
  report.push('-'.repeat(30))
  props.rods.forEach((rod, index) => {
    report.push(`Стержень ${index + 1}:`)
    report.push(`  L = ${rod.L} м`)
    report.push(`  A = ${rod.A.toExponential(3)} м²`)
    report.push(`  E = ${rod.E.toExponential(3)} Па`)
    report.push(`  [σ] = ${rod.sigma.toExponential(3)} Па`)
    report.push('')
  })
  
  report.push('РЕЗУЛЬТАТЫ РАСЧЁТА:')
  report.push('-'.repeat(30))
  report.push('Перемещения узлов:')
  normalizedResults.value.forEach((result, index) => {
    report.push(`  Узел ${result.node}: u = ${result.displacement.toExponential(3)} м`)
  })
  report.push('')
  
  report.push('Продольные силы:')
  longitudinalForces.value.forEach((force, index) => {
    report.push(`  Стержень ${force.rodNumber}: Nx = ${force.force.toExponential(3)} Н`)
  })
  report.push('')
  
  report.push('Нормальные напряжения:')
  normalStresses.value.forEach((stress, index) => {
    report.push(`  Стержень ${stress.rodNumber}: Ox = ${stress.stress.toExponential(3)} Па (${stress.status})`)
  })
  report.push('')
  
  report.push('СВОДНАЯ ИНФОРМАЦИЯ:')
  report.push('-'.repeat(30))
  report.push(`Количество стержней: ${rodsCount.value}`)
  report.push(`Количество узлов: ${nodesCount.value}`)
  report.push(`Максимальное перемещение: ${maxDisplacement.value.toExponential(3)} м`)
  report.push(`Максимальное напряжение: ${maxStress.value.toExponential(3)} Па`)
  report.push(`Максимальная сила: ${Math.max(...longitudinalForces.value.map(f => Math.abs(f.force)), 0).toExponential(3)} Н`)
  
  return report.join('\n')
}

// Обновляем графики при изменении результатов
onMounted(() => {
  nextTick(() => {
    drawDisplacementChart()
    drawStressChart()
    drawForceChart()
    drawEpureChart()
    updateSectionResults()
  })
})

// Следим за изменениями результатов и перерисовываем графики
import { watch } from 'vue'
watch(() => props.calculationResults, () => {
  nextTick(() => {
    drawDisplacementChart()
    drawStressChart()
    drawForceChart()
    drawEpureChart()
    updateSectionResults()
  })
}, { deep: true })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  width: 1000px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #334155;
}

.modal-header h2 {
  color: #f1f5f9;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #334155;
  color: #f1f5f9;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.results-section {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 20px;
}

.results-section h3 {
  color: #f1f5f9;
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
}

.table-container {
  overflow-x: auto;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  background: #1e293b;
  border-radius: 6px;
  overflow: hidden;
}

.results-table th {
  background: #334155;
  color: #f1f5f9;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
}

.results-table td {
  padding: 12px 16px;
  border-top: 1px solid #334155;
  color: #cbd5e1;
  font-size: 14px;
}

.results-table tr:hover {
  background: #334155;
}

.formula-cell {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #94a3b8;
}

.status-ok {
  color: #10b981;
  font-weight: 600;
}

.status-danger {
  color: #ef4444;
  font-weight: 600;
}

.chart-container {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  justify-content: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
}

.summary-label {
  color: #94a3b8;
  font-size: 14px;
}

.summary-value {
  color: #f1f5f9;
  font-weight: 600;
  font-size: 14px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #334155;
}

.export-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.export-btn:hover {
  background: #2563eb;
}

.close-modal-btn {
  background: #64748b;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.close-modal-btn:hover {
  background: #475569;
}

/* Стили для селектора сечения */
.section-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
}

.selector-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selector-row label {
  min-width: 120px;
  color: #94a3b8;
  font-size: 14px;
}

.selector-row select,
.selector-row input {
  flex: 1;
  padding: 8px 12px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 4px;
  color: #f1f5f9;
  font-size: 14px;
}

.selector-row select:focus,
.selector-row input:focus {
  outline: none;
  border-color: #3b82f6;
}

/* Стили для результатов сечения */
.section-results {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  padding: 16px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 4px;
}

.result-label {
  color: #94a3b8;
  font-size: 13px;
}

.result-value {
  color: #f1f5f9;
  font-weight: 600;
  font-size: 13px;
}

/* Скрытие полос прокрутки */
.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: #334155;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #64748b;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
