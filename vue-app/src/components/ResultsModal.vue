<template>

  <div v-if="isVisible" class="modal-overlay" @click="closeModal">

    <div class="modal-content" @click.stop>

      <div class="modal-header">

        <h2>ПОСТПРОЦЕССОР</h2>

        <button class="close-btn" @click="closeModal">×</button>

      </div>

      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'displacement' }"
          @click="activeTab = 'displacement'"
        >
          ▲
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'tables' }"
          @click="activeTab = 'tables'"
        >
          Таблицы
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'charts' }"
          @click="activeTab = 'charts'"
        >
          Графики
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'section' }"
          @click="activeTab = 'section'"
        >
          В точке
        </button>
      </div>

      <div class="modal-body">

        <!-- Tab Content: Displacement Vector -->
        <div v-if="activeTab === 'displacement'" class="tab-content">
        <div class="results-section">
          <h3>Перемещения узлов</h3>
          <div class="tri-wrap">
          <div class="table-container">
            <table class="results-table">
              <thead>
                <tr>
                  <th>Узел</th>
                  <th>Перемещение u (м)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="result in normalizedResults" :key="result.node">
                  <td>{{ result.node }}</td>
                  <td>{{ formatNumber(result.displacement) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          </div>
          </div>
        </div>

        <!-- Tab Content: Tables -->
        <div v-if="activeTab === 'tables'" class="tab-content">
          <!-- Продольные силы Nx -->
        <div class="results-section">
          <h3>Продольные силы Nx</h3>
          <div class="table-container">
            <table class="results-table">
              <thead>
                <tr>
                  <th>Стержень</th>
                  <th>Nx (0) [qL]</th>
                  <th>Nx (Li) [qL]</th>
                  <th>Деформация ε</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(force, index) in longitudinalForces" :key="index">
                  <td>{{ force.rodNumber }}</td>
                  <td>{{ formatNumber(force.forceAtStart) }}</td>
                  <td>{{ formatNumber(force.forceAtEnd) }}</td>
                  <td>{{ formatNumber(force.strain) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

          <!-- Нормальные напряжения σp(x) -->
        <div class="results-section">
          <h3>Нормальные напряжения σ<sub>p</sub>(x)</h3>
          <div class="table-container">
            <table class="results-table">
              <thead>
                <tr>
                  <th>Стержень</th>
                  <th>σ<sub>p</sub>(0) [qL/A]</th>
                  <th>σ<sub>p</sub>(Li) [qL/A]</th>
                  <th>Допустимое [σ] [qL/A]</th>
                    <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(stress, index) in normalStresses" :key="index">
                  <td>{{ stress.rodNumber }}</td>
                  <td>{{ formatNumber(stress.stressAtStart) }}</td>
                  <td>{{ formatNumber(stress.stressAtEnd) }}</td>
                  <td>{{ formatNumber(stress.allowable) }}</td>
                    <td class="status-icon">
                      <span v-if="Math.abs(stress.stressAtStart) <= stress.allowable && Math.abs(stress.stressAtEnd) <= stress.allowable" class="status-ok">✓</span>
                      <span v-else class="status-error">✗</span>
                    </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>

          <!-- Перемещения Up(x) -->
          <div class="results-section">
            <h3>Перемещения Up(x)</h3>
            <div class="table-container">
              <table class="results-table">
                <thead>
                  <tr>
                    <th>Стержень</th>
                    <th>Up(0) [м]</th>
                    <th>Up(Li) [м]</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(rod, index) in props.rods" :key="index">
                    <td>{{ index + 1 }}</td>
                    <td>{{ formatNumber(props.calculationResults.displacements?.[index] || 0) }}</td>
                    <td>{{ formatNumber(props.calculationResults.displacements?.[index + 1] || 0) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
        </div>

          <!-- Отображение результатов в таблицах -->
        <div class="results-section">
            <h3>Отображение результатов в таблицах</h3>
            <div class="member-selector">
              <label>Стержень:</label>
              <select v-model="selectedMemberId" @change="updateMemberTable">
                <option v-for="member in memberList" :key="member.id" :value="member.id">
                  Стержень {{ member.id }}
                </option>
              </select>
            </div>
            <div class="table-container">
              <table class="member-sample-table">
                <thead>
                  <tr>
                    <th class="col-text">Index</th>
                    <th class="col-num">x (м)</th>
                    <th class="col-num">x/L</th>
                    <th class="col-num">Nx (N)</th>
                    <th class="col-num">σx (Pa)</th>
                    <th class="col-num">ux (м)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in memberTableData" :key="index" :class="{ 'even-row': index % 2 === 0 }">
                    <td class="col-text">{{ row.index }}</td>
                    <td class="col-num">{{ formatNumber(row.x) }}</td>
                    <td class="col-num">{{ formatNumber(row.xOverL) }}</td>
                    <td class="col-num">{{ formatNumber(row.nx * 1000) }}</td>
                    <td class="col-num">{{ formatNumber(row.sigma * 1e6) }}</td>
                    <td class="col-num">{{ formatNumber(row.ux / 1000) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab Content: Charts -->
        <div v-if="activeTab === 'charts'" class="tab-content">
          <div class="results-section chart-section">
          <h3>Эпюры напряжённо-деформированного состояния</h3>
            <div class="chart-container" ref="chartContainer">
              <canvas ref="epureChart"></canvas>
          </div>
          </div>
        </div>

        <!-- Tab Content: Section Results -->
        <div v-if="activeTab === 'section'" class="tab-content">
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
                <div v-if="!isValidCoordinate" class="validation-message">
                  Введите значение в пределах длины стержня (0–{{ getRodLength(selectedRod) }})
            </div>
          </div>
            </div>
            <div v-if="isValidCoordinate && sectionResults" class="section-results">
            <div class="result-item">
              <span class="result-label">Перемещение Ux:</span>
              <span class="result-value">{{ formatNumber(sectionResults.displacement) }} м</span>
            </div>
            <div class="result-item">
              <span class="result-label">Деформация ε:</span>
              <span class="result-value">{{ formatNumber(sectionResults.strain) }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Напряжение Ox:</span>
              <span class="result-value">{{ formatNumber(sectionResults.stress) }} Па</span>
            </div>
            <div class="result-item">
              <span class="result-label">Продольная сила Nx:</span>
              <span class="result-value">{{ formatNumber(sectionResults.force) }} Н</span>
            </div>
            <div class="result-item">
              <span class="result-label">Запас прочности:</span>
              <span class="result-value">{{ formatNumber(sectionResults.safetyFactor) }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Статус:</span>
              <span class="result-value" :class="sectionResults.status === 'OK' ? 'status-ok' : 'status-danger'">
                {{ sectionResults.status }}
              </span>
            </div>
          </div>
        </div>
                </div>

              </div>



      <div class="modal-footer">
        <button class="btn-export" @click="exportPdf" :disabled="isExporting" :aria-label="isExporting ? 'Экспорт в процессе...' : 'Экспорт результатов в PDF'">
          {{ isExporting ? 'Экспорт...' : 'Экспорт результатов' }}
        </button>
        <button class="close-modal-btn" @click="closeModal">Закрыть</button>
      </div>

    </div>

  </div>

</template>



<script setup>

import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'



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



// Универсальная функция форматирования чисел
const formatNumber = (value, precision = 3) => {
  if (Math.abs(value) > 9999) {
    return value.toExponential(precision)
  } else {
    return value.toFixed(precision)
  }
}



const emit = defineEmits(['close'])

// Active tab state
const activeTab = ref('displacement')

const epureChart = ref(null)
const chartContainer = ref(null)
let resizeObserver = null



// Проверка валидности координаты
const isValidCoordinate = computed(() => {
  if (selectedCoordinate.value === null || selectedCoordinate.value === undefined) {
    return false
  }
  const rodLength = getRodLength(selectedRod.value)
  return selectedCoordinate.value >= 0 && selectedCoordinate.value <= rodLength
})

// Реактивные переменные для выбора сечения

const selectedRod = ref(1)

const selectedCoordinate = ref(0)

const sectionResults = ref(null)



// Реактивные переменные для таблицы результатов по стержням

const selectedMemberId = ref(1)

const memberTableData = ref([])

const isExporting = ref(false)

// Для отслеживания показанных алертов о параболичности
const lastAlertKey = ref(null)

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

    

    // Перемещения узлов стержня

    const U_p_0 = displacements[index] || 0        // левый узел

    const U_p_L = displacements[index + 1] || 0    // правый узел

    

    // Распределённая нагрузка на стержень

    const rodLoad = props.rodLoads.find(load => load.rodNumber === index + 1)

    const q_p = rodLoad ? Number(rodLoad.forceX) : 0

    

    // Формула: N_p(x) = (E_p * A_p / L_p) * (U_{p,L} - U_{p,0}) + (q_p * L_p / 2) * (1 - (2x / L_p))

    // Для x = 0 (левый конец):

    const Nx_0 = (E * A / L) * (U_p_L - U_p_0) + (q_p * L / 2) * (1 - (2 * 0 / L))

    // Для x = L (правый конец):

    const Nx_L = (E * A / L) * (U_p_L - U_p_0) + (q_p * L / 2) * (1 - (2 * L / L))

    

    // Деформация стержня

    const strain = (U_p_L - U_p_0) / L

    

    results.push({

      rodNumber: index + 1,

      forceAtStart: Nx_0,      // Ni(0)

      forceAtEnd: Nx_L,        // Ni(Li)

      strain: strain,

      length: L,

      area: A,

      modulus: E,

      distributedLoad: q_p

    })

  })

  

  return results

})



// Расчёт нормальных напряжений Ox в каждом сечении по формуле σ_p(x) = N_p(x) / A_p
const normalStresses = computed(() => {

  const results = []

  const displacements = props.calculationResults.displacements || []

  

  props.rods.forEach((rod, index) => {

    const L = Number(rod.L)

    const A = Number(rod.A)

    const E = Number(rod.E)

    const sigma = Number(rod.sigma)

    

    // Перемещения узлов стержня
    const U_p_0 = displacements[index] || 0        // левый узел
    const U_p_L = displacements[index + 1] || 0    // правый узел
    
    // Распределённая нагрузка на стержень
    const rodLoad = props.rodLoads.find(load => load.rodNumber === index + 1)
    const q_p = rodLoad ? Number(rodLoad.forceX) : 0
    
    // Продольная сила N_p(x) по формуле:
    // N_p(x) = (E_p * A_p / L_p) * (U_{p,L} - U_{p,0}) + (q_p * L_p / 2) * (1 - (2x / L_p))
    
    // Для x = 0 (начало стержня):
    const N_p_0 = (E * A / L) * (U_p_L - U_p_0) + (q_p * L / 2) * (1 - (2 * 0 / L))
    const sigma_p_0 = N_p_0 / A
    
    // Для x = L (конец стержня):
    const N_p_L = (E * A / L) * (U_p_L - U_p_0) + (q_p * L / 2) * (1 - (2 * L / L))
    const sigma_p_L = N_p_L / A
    
    // Деформация для справки
    const strain = (U_p_L - U_p_0) / L
    
    // Запас прочности по максимальному напряжению
    const maxStress = Math.max(Math.abs(sigma_p_0), Math.abs(sigma_p_L))
    const safetyFactor = sigma / maxStress
    const status = maxStress <= sigma ? 'OK' : 'ПРЕВЫШЕНО'
    

    results.push({

      rodNumber: index + 1,

      stressAtStart: sigma_p_0,     // σ_p(0)
      stressAtEnd: sigma_p_L,       // σ_p(Li)
      strain: strain,               // для справки
      allowable: sigma,

      safetyFactor: safetyFactor,

      status: status,
      longitudinalForceAtStart: N_p_0,  // N_p(0) для справки
      longitudinalForceAtEnd: N_p_L    // N_p(Li) для справки
    })

  })

  

  return results

})



// Построение распределения напряжений по узлам, чтобы не путались значения на границах
const buildNodeStresses = () => {
  const rodsSt = normalStresses.value || [];
  const m = rodsSt.length;

  // Массив узлов (0..m)
  const nodes = Array.from({ length: m + 1 }, () => ({ left: null, right: null }));

  for (let i = 0; i < m; i++) {
    // стержень i соединяет узлы i и i+1
    // справа у узла i — начало текущего стержня
    nodes[i].right = rodsSt[i].stressAtStart;

    // слева у узла i+1 — конец текущего стержня
    nodes[i + 1].left = rodsSt[i].stressAtEnd;
  }

  return nodes;
};

// Пример использования:
// Для узла k:
//  слева (σ_{k}(L_k)) = nodes[k].left
//  справа (σ_{k+1}(0)) = nodes[k].right


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

  const U_p_0 = displacements[rodIndex] || 0

  const U_p_L = displacements[rodIndex + 1] || 0

  

  // Распределённая нагрузка на стержень

  const rodLoad = props.rodLoads.find(load => load.rodNumber === rodNumber)

  const q_p = rodLoad ? Number(rodLoad.forceX) : 0

  

  // Линейная интерполяция перемещения в сечении

  const xi = localCoordinate / L // безразмерная координата

  const ux = U_p_0 + (U_p_L - U_p_0) * xi

  

  // Деформация постоянна по длине стержня

  const strain = (U_p_L - U_p_0) / L

  

  // Формула для продольной силы в сечении x:

  const Nx = (E * A / L) * (U_p_L - U_p_0) + (q_p * L / 2) * (1 - (2 * localCoordinate / L))

  

  // Напряжение в сечении по формуле σ_p(x) = N_p(x) / A_p
  const Ox = Nx / A
  

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

  return Math.max(...normalStresses.value.map(s => Math.max(Math.abs(s.stressAtStart), Math.abs(s.stressAtEnd))), 0)
})



// Список стержней для выбора
const memberList = computed(() => {
  return props.rods.map((rod, index) => ({
    id: index + 1,
    L: Number(rod.L),
    A: Number(rod.A),
    E: Number(rod.E),
    q: props.rodLoads.find(load => load.rodNumber === index + 1)?.forceX || 0,
    U0: props.calculationResults.displacements?.[index] || 0,
    UL: props.calculationResults.displacements?.[index + 1] || 0
  }))
})

// Лог метода Гаусса

const gaussSteps = computed(() => {

  return props.calculationResults.gaussSteps || []

})



// Матрица жёсткости и вектор сил

const stiffnessMatrix = computed(() => {

  return props.calculationResults.stiffnessMatrix || []

})



const forceVector = computed(() => {

  return props.calculationResults.forceVector || []

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

  if (selectedRod.value && selectedCoordinate.value !== null && isValidCoordinate.value) {

    sectionResults.value = getSectionResults(selectedRod.value, selectedCoordinate.value)

  } else {

    sectionResults.value = null

  }

}

// Функции для работы с таблицей результатов по стержням
const nxAt = (member, x) => {
  const { U0, UL, L, q, E, A } = member
  return (E * A / L) * (UL - U0) + (q * L / 2) * (1 - (2 * x / L))
}

const sigmaAt = (member, x) => {
  return nxAt(member, x) / member.A
}
//пипец
const uxAtMember = (member, x) => {
  const { U0, UL, L, q, E, A } = member
  if (Math.abs(q) < 1e-12) {
    return U0 + ((UL - U0) / L) * x
  } else {
    return U0 + ((UL - U0) / L) * x + (q * L * L / (2 * E * A * L)) * x * (1 - x / L)
  }
}

const updateMemberTable = () => {
  const member = memberList.value.find(m => m.id === selectedMemberId.value)
  if (!member) return
  
  const rows = []
  for (let i = 0; i <= 20; i++) {
    const x = (i / 20) * member.L
    const nx = nxAt(member, x) / 1000 // Convert to kN
    const sigma = sigmaAt(member, x) / 1e6 // Convert to MPa
    const ux = uxAtMember(member, x) * 1000 // Convert to mm
    
    rows.push({
      index: i + 1,
      x: x,
      xOverL: x / member.L,
      nx: nx,
      sigma: sigma,
      ux: ux
    })
  }
  
  memberTableData.value = rows
}




// PDF Export functions
const addNodeAsPage = async (pdf, node, topOffset = 70) => {
  const canvas = await html2canvas(node, { 
    backgroundColor: '#0f172a', 
    scale: window.devicePixelRatio || 1 
  })
  const img = canvas.toDataURL('image/png')
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const availW = pageW - 24
  const availH = pageH - topOffset - 12
  const ratio = Math.min(availW / canvas.width, availH / canvas.height)
  const w = canvas.width * ratio
  const h = canvas.height * ratio
  
  // Добавляем изображение под заголовком
  pdf.addImage(img, 'PNG', (pageW - w) / 2, topOffset, w, h)
}

// Функция для создания заголовка с датой
const createDateHeader = (dateStr) => {
  const headerCanvas = document.createElement('canvas')
  headerCanvas.width = 800
  headerCanvas.height = 50
  const ctx = headerCanvas.getContext('2d')
  
  // Фон заголовка
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, headerCanvas.width, headerCanvas.height)
  
  // Текст с датой - БОЛЬШЕ и ЖИРНЕЕ
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px Arial'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`Дата создания: ${dateStr}`, 20, 25)
  
  return headerCanvas.toDataURL('image/png')
}

const exportPdf = async () => {
  if (isExporting.value) return
  
  try {
    isExporting.value = true
    
    // Сохраняем текущую активную вкладку
    const originalTab = activeTab.value
    
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    
    // Полный отчёт: собираем все вкладки (кроме последней 'section')
    const tabs = ['displacement', 'tables', 'charts']
    const dateStr = new Date().toLocaleString('ru-RU')
    
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i]
      
      // Переключаемся на вкладку
      activeTab.value = tab
      
      // Ждём перерисовки
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Получаем содержимое вкладки
      let currentNode = null
      switch (tab) {
        case 'displacement':
          currentNode = document.querySelector('.tab-content .results-section')
          break
        case 'tables':
          currentNode = document.querySelector('.tab-content')
          break
        case 'charts':
          currentNode = document.querySelector('.chart-section')
          break
        case 'section':
          currentNode = document.querySelector('.tab-content .results-section')
          break
      }
      
      if (currentNode) {
        // Добавляем новую страницу для каждого раздела
        if (i > 0) {
          pdf.addPage()
        }
        
        // Рисуем тёмный фон для всей страницы ПЕРЕД добавлением заголовка
        const pageW = pdf.internal.pageSize.getWidth()
        const pageH = pdf.internal.pageSize.getHeight()
        pdf.setFillColor(15, 23, 42) // #0f172a в RGB
        pdf.rect(0, 0, pageW, pageH, 'F')
        
        // Добавляем заголовок с датой
        const dateHeaderImg = createDateHeader(dateStr)
        pdf.addImage(dateHeaderImg, 'PNG', 20, 10, 800, 50)
        
        // Добавляем содержимое вкладки как изображение
        await addNodeAsPage(pdf, currentNode)
      }
    }
    
    // Возвращаем исходную активную вкладку
    activeTab.value = originalTab
    await nextTick()
    
    // Save file
    const blob = pdf.output('blob')
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: `report_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`,
        types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }]
      })
      const w = await handle.createWritable()
      await w.write(blob)
      await w.close()
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }
    
    // Show success toast
    console.log('PDF экспортирован успешно')
    
  } catch (error) {
    console.error('Ошибка при экспорте PDF:', error)
  } finally {
    isExporting.value = false
  }
}

const getTabLabel = (tab) => {
  const labels = {
    'displacement': 'Перемещения',
    'tables': 'Таблицы',
    'charts': 'Графики',
    'section': 'В точке'
  }
  return labels[tab] || tab
}

const calculateRequiredHeight = () => {
  const displacements = props.calculationResults.displacements || []
  const stresses = normalStresses.value
  const forces = longitudinalForces.value
  
  if (displacements.length === 0) return 400
  
  // Базовые размеры
  const constructionHeight = 120
  const epureHeight = 120 // фиксированная высота для каждой эпюры
  const margin = 120 // увеличиваем левый отступ для видимости подписей
  const padding = 32 // отступы сверху и снизу
  
  // Вычисляем максимальные значения для масштабирования
  const maxDisp = Math.max(...displacements.map(Math.abs))
  const maxStress = Math.max(...stresses.map(s => Math.max(Math.abs(s.stressAtStart), Math.abs(s.stressAtEnd))))
  const maxForce = Math.max(...forces.map(f => Math.max(Math.abs(f.forceAtStart), Math.abs(f.forceAtEnd))))
  
  // Вычисляем необходимую высоту для каждой эпюры с учетом масштабирования
  const scaleY = Math.max(maxDisp, maxStress, maxForce) > 0 ? 60 : 30 // высота для масштабирования
  const totalEpureHeight = epureHeight * 3 + scaleY * 2 // 3 эпюры + масштабирование
  
  return constructionHeight + margin + totalEpureHeight + padding
}

const resizeCanvas = () => {
  const canvas = epureChart.value
  const container = chartContainer.value
  if (!canvas || !container) return
  
  const dpr = window.devicePixelRatio || 1
  const requiredHeight = calculateRequiredHeight()
  
  // Устанавливаем размеры canvas
  canvas.style.width = `${container.clientWidth}px`
  canvas.style.height = `${requiredHeight}px`
  canvas.width = Math.round(container.clientWidth * dpr)
  canvas.height = Math.round(requiredHeight * dpr)
  
  // Настраиваем контекст для высокого DPI
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

const drawEpureChart = () => {
  const canvas = epureChart.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const width = canvas.width / (window.devicePixelRatio || 1)
  const height = canvas.height / (window.devicePixelRatio || 1)

  // Очистка canvas
  ctx.clearRect(0, 0, width, height)

  

  // Настройки для более четкого рендеринга
  ctx.imageSmoothingEnabled = false
  ctx.lineCap = 'square'
  ctx.lineJoin = 'miter'
  
  const displacements = props.calculationResults.displacements || []
  const stresses = normalStresses.value

  const forces = longitudinalForces.value
  
  if (displacements.length === 0) return
  
  // Разделяем canvas на секции: конструкция сверху, эпюры снизу
  const constructionHeight = 120
  const epureHeight = 120 // фиксированная высота для каждой эпюры
  const margin = 120 // увеличиваем левый отступ для видимости подписей
  
  // Параметры масштабирования (точно как в KonvaStage)
  const unitPxPerMeter = 120
  const baseHeightPx = 80
  const scaleCap = 7
  
  // Строим конструкцию точно как в KonvaStage
  const rodLengths = props.rods.map(rod => Number(rod.L))

  const totalRodLength = rodLengths.reduce((sum, len) => sum + len, 0)

  const totalWidthInPx = totalRodLength * unitPxPerMeter
  const scaleX = (width - 2 * margin) / totalWidthInPx
  
  // Координаты конструкции (как в KonvaStage)
  const originX = margin
  const originY = margin + constructionHeight / 2
  
  let currentX = originX
  
  // Рисуем каждый стержень точно как в KonvaStage
  props.rods.forEach((rod, index) => {
    const L = Number(rod.L)
    const A = Number(rod.A)
    
    // Размеры стержня (точно как в KonvaStage)
    const rodWidth = L * unitPxPerMeter * scaleX
    const aNum = Number(A)
    const rodHeight = aNum > 0 ? Math.min(aNum, scaleCap) * baseHeightPx / 2 : 20 // увеличиваем высоту для видимости
    
    // Координаты стержня
    const rodX = currentX
    const rodY = originY - rodHeight / 2
    
    // Рисуем стержень как прямоугольник 
    ctx.fillStyle = '#4f9cf9'
    ctx.strokeStyle = '#1f5fbf'
    ctx.lineWidth = 2
    ctx.fillRect(rodX, rodY, rodWidth, rodHeight)
    ctx.strokeRect(rodX, rodY, rodWidth, rodHeight)
    
    // Номер стержня (розовый круг, как в KonvaStage)
    const rodCenterX = rodX + rodWidth / 2
    const rodCenterY = rodY + rodHeight / 2
    const rodRadius = 12 * scaleX / unitPxPerMeter
    
    ctx.fillStyle = '#ec6aa0'
    ctx.strokeStyle = '#b44f7a'
    ctx.lineWidth = 2
    ctx.beginPath()

    ctx.arc(rodCenterX, rodCenterY, rodRadius, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()

    

    // Номер стержня
    ctx.fillStyle = '#ffffff'
    ctx.font = `${14 * scaleX / unitPxPerMeter}px Arial`
    ctx.textAlign = 'center'

    ctx.textBaseline = 'middle'
    ctx.fillText(`${index + 1}`, rodCenterX, rodCenterY)

    currentX += rodWidth

  })

  

  // Находим самый высокий стержень для позиционирования узлов
  let maxRodHeight = 0
  props.rods.forEach((rod, index) => {
    const L = Number(rod.L)
    const A = Number(rod.A)
    const aNum = Number(A)
    const rodHeight = aNum > 0 ? Math.min(aNum, scaleCap) * baseHeightPx / 2 : 20
    maxRodHeight = Math.max(maxRodHeight, rodHeight)
  })
  
  // Рисуем подписи длины стержней розовым цветом снизу от стержней
  ctx.fillStyle = '#ec6aa0' // розовый цвет
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  
  let labelX = originX
  props.rods.forEach((rod, index) => {
    const L = Number(rod.L)
    const A = Number(rod.A)
    const aNum = Number(A)
    const rodHeight = aNum > 0 ? Math.min(aNum, scaleCap) * baseHeightPx / 2 : 20
    const rodWidth = L * unitPxPerMeter * scaleX
    
    // Calculate individual beam bottom Y coordinate
    const beamBottomY = originY + rodHeight / 2
    const textY = beamBottomY + 10
    
    // Center label horizontally between beam start and end
    const beamCenterX = labelX + rodWidth / 2
    
    // Clamp text position to avoid overlapping with pink verticals
    const clampedX = Math.max(labelX + 8, Math.min(labelX + rodWidth - 8, beamCenterX))
    
    ctx.fillText(`${L}L`, clampedX, textY)
    labelX += rodWidth
  })
  
  // Вычисляем верхний край самого высокого стержня
  const tallestRodTop = originY - maxRodHeight / 2
  
  // Рисуем узлы (фиолетовые квадраты, как в KonvaStage)
  let nodeX = originX
  displacements.forEach((disp, index) => {
    const nodeNumber = index + 1
    
    // Размеры узла (фиксированные для видимости)
    const nodeSize = 16
    const nodeY = tallestRodTop - nodeSize - 30 // 12 пикселей выше самого высокого стержня
    
    // Узел (фиолетовый квадрат) - точный контроль каждой границы
    ctx.fillStyle = '#8b5cf6'
    ctx.strokeStyle = '#7c3aed'
  ctx.lineWidth = 1

    
    // Округляем координаты для выравнивания по пиксельной сетке
    const rectX = Math.round(nodeX - nodeSize/2)
    const rectY = Math.round(nodeY)
    
    // Сначала заливаем прямоугольник
    ctx.fillRect(rectX, rectY, nodeSize, nodeSize)
    
    // Затем рисуем каждую границу отдельно для равномерной резкости
    ctx.beginPath()

    // Верхняя граница
    ctx.moveTo(rectX, rectY)
    ctx.lineTo(rectX + nodeSize, rectY)
    // Правая граница
    ctx.moveTo(rectX + nodeSize, rectY)
    ctx.lineTo(rectX + nodeSize, rectY + nodeSize)
    // Нижняя граница
    ctx.moveTo(rectX + nodeSize, rectY + nodeSize)
    ctx.lineTo(rectX, rectY + nodeSize)
    // Левая граница
    ctx.moveTo(rectX, rectY + nodeSize)
    ctx.lineTo(rectX, rectY)
    ctx.stroke()

    

    // Номер узла
    ctx.fillStyle = '#ffffff'
  ctx.font = '12px Arial'

  ctx.textAlign = 'center'

    ctx.textBaseline = 'middle'
    ctx.fillText(`${nodeNumber}`, nodeX, nodeY + nodeSize/2)
    
    // Пунктирная линия к стержню (как в KonvaStage)
    ctx.strokeStyle = '#8b5cf6'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
  ctx.beginPath()

    ctx.moveTo(nodeX, nodeY + nodeSize)
    ctx.lineTo(nodeX, originY)
  ctx.stroke()

    ctx.setLineDash([])
    
    // Переходим к следующему узлу
    if (index < displacements.length - 1) {

      const rodWidth = Number(props.rods[index].L) * unitPxPerMeter * scaleX
      nodeX += rodWidth
    }
  })
  
// Helper function for fixed support drawing
function drawFixedSupport(ctx, side, beam, opts) {
  const o = { wallWidth: 3, ribLen: 14, ribGap: 22, ribAngleDeg: 45, color: '#fff', lineWidth: 2.5, ...(opts || {}) }

  const edgeX = (side === 'left') ? beam.x1 : beam.x2
  const yTop = beam.topY, yBot = beam.botY

  ctx.save()
  ctx.strokeStyle = o.color
  ctx.lineWidth = o.lineWidth
  ctx.lineCap = 'round'

  // 1) vertical wall on the beam edge
    ctx.beginPath()
  ctx.moveTo(edgeX + 0.5, yTop)
  ctx.lineTo(edgeX + 0.5, yBot)
    ctx.stroke()

  // 2) diagonal ribs, going outward from wall
  const dir = (side === 'left') ? -1 : +1 // outward direction
  const ang = o.ribAngleDeg * Math.PI / 180
  const dx = Math.cos(ang) * o.ribLen * dir
  const dy = (side === 'left') ? Math.sin(ang) * o.ribLen : -Math.sin(ang) * o.ribLen // right side ribs go upward

  // start a little below top, end a little above bottom
  const margin = 8
  let y = yTop + margin
  while (y + margin < yBot) {
    // each rib starts at the wall and goes outward
    const x1 = edgeX
    const y1 = y
    const x2 = x1 + dx
    const y2 = y1 + dy
      
      ctx.beginPath()
    ctx.moveTo(x1 + 0.5, y1)
    ctx.lineTo(x2 + 0.5, y2)
      ctx.stroke()

    y += o.ribGap
  }

  ctx.restore()
  }

  

  // Calculate beam dimensions for supports
  const beamLeftX = originX
  const beamRightX = originX + totalWidthInPx * scaleX
  const beamTopY = originY - maxRodHeight / 2
  const beamBotY = originY + maxRodHeight / 2

  // Draw fixed supports
  const embedmentType = props.embedment || 'left'
  
  // left support (if enabled)
  if (embedmentType === 'left' || embedmentType === 'both') {
    drawFixedSupport(ctx, 'left', { x1: beamLeftX, x2: beamRightX, topY: beamTopY, botY: beamBotY }, { lineWidth: 3, ribLen: 14, ribGap: 22 })
  }
  // right support (if enabled)
  if (embedmentType === 'right' || embedmentType === 'both') {
    drawFixedSupport(ctx, 'right', { x1: beamLeftX, x2: beamRightX, topY: beamTopY, botY: beamBotY }, { lineWidth: 3, ribLen: 14, ribGap: 22 })
  }

  // Масштабы для эпюр
  const maxDisp = Math.max(...displacements.map(Math.abs))
  const maxStress = Math.max(...stresses.map(s => Math.max(Math.abs(s.stressAtStart), Math.abs(s.stressAtEnd))))
  const maxForce = Math.max(...forces.map(f => Math.max(Math.abs(f.forceAtStart), Math.abs(f.forceAtEnd))))
  
  // Рисуем сосредоточенные нагрузки (розовые стрелки от центра узлов)
  ctx.fillStyle = '#ec6aa0' // розовый цвет
  ctx.strokeStyle = '#ec6aa0' // розовый цвет
  ctx.font = '12px Arial'

  ctx.lineWidth = 2

  

  // Сосредоточенные нагрузки на узлах

  props.loads.forEach(load => {

    const nodeIndex = load.nodeNumber - 1

    if (nodeIndex >= 0 && nodeIndex < displacements.length) {

      const nodeX = originX + rodLengths.slice(0, nodeIndex).reduce((sum, len) => sum + len * unitPxPerMeter * scaleX, 0)
      const forceValue = Number(load.forceX)

      

      if (forceValue !== 0) {

        // Стрелка нагрузки от соответствующей грани узла
        const arrowLength = 25
        const nodeY = tallestRodTop - 16 - 30 // позиция узла
        const arrowY = nodeY + 8 // центр фиолетового квадрата узла
        const nodeSize = 16
        

        if (forceValue > 0) {

          // Нагрузка вправо - от середины правой грани
          const startX = nodeX + nodeSize/2 // правая грань узла
          ctx.beginPath()

          ctx.moveTo(startX, arrowY)
          ctx.lineTo(startX + arrowLength, arrowY)
          ctx.stroke()

          

          // Наконечник стрелки

          ctx.beginPath()

          ctx.moveTo(startX + arrowLength, arrowY)
          ctx.lineTo(startX + arrowLength - 6, arrowY - 4)
          ctx.lineTo(startX + arrowLength - 6, arrowY + 4)
          ctx.closePath()

          ctx.fill()

          

          ctx.fillText(`${forceValue}qL`, startX + arrowLength/2, arrowY - 10) // точно над стрелкой по центру
        } else {

          // Нагрузка влево - от середины левой грани
          const startX = nodeX - nodeSize/2 // левая грань узла
          ctx.beginPath()

          ctx.moveTo(startX, arrowY)
          ctx.lineTo(startX - arrowLength, arrowY)
          ctx.stroke()

          

          // Наконечник стрелки

          ctx.beginPath()

          ctx.moveTo(startX - arrowLength, arrowY)
          ctx.lineTo(startX - arrowLength + 6, arrowY - 4)
          ctx.lineTo(startX - arrowLength + 6, arrowY + 4)
          ctx.closePath()

          ctx.fill()

          

          ctx.fillText(`${forceValue}qL`, startX - arrowLength/2, arrowY - 10) // точно над стрелкой по центру
        }

      }

    }

  })

  

  // Распределённые нагрузки на стержнях (фиолетовые стрелки)
  ctx.fillStyle = '#8b5cf6' // фиолетовый цвет
  ctx.strokeStyle = '#8b5cf6' // фиолетовый цвет
  ctx.font = '12px Arial'
  ctx.lineWidth = 2
  
  props.rodLoads.forEach(load => {

    const rodIndex = load.rodNumber - 1

    if (rodIndex >= 0 && rodIndex < rodLengths.length) {

      const rodStartX = originX + rodLengths.slice(0, rodIndex).reduce((sum, len) => sum + len * unitPxPerMeter * scaleX, 0)
      const rodEndX = rodStartX + rodLengths[rodIndex] * unitPxPerMeter * scaleX
      const rodCenterX = (rodStartX + rodEndX) / 2

      const forceValue = Number(load.forceX)

      

      if (forceValue !== 0) {

        // Рисуем стрелки распределённой нагрузки только между узлами
        const nodeY = tallestRodTop - 16 - 12 // позиция узла
        const arrowY = nodeY + 16 // нижний край фиолетового квадрата узла
        
        // Ограничиваем область стрелок границами стержня (между узлами)
        const arrowStartX = rodStartX + 8 // небольшой отступ от начала стержня
        const arrowEndX = rodEndX - 8 // небольшой отступ от конца стержня
        const arrowAreaWidth = arrowEndX - arrowStartX
        
        const arrowCount = Math.max(3, Math.floor(arrowAreaWidth / 40))
        const arrowSpacing = arrowAreaWidth / (arrowCount - 1)
        

        for (let i = 0; i < arrowCount; i++) {

          const arrowX = arrowStartX + i * arrowSpacing
          

          if (forceValue > 0) {

            // Нагрузка вправо

            ctx.beginPath()

            ctx.moveTo(arrowX, arrowY)

            ctx.lineTo(arrowX + 18, arrowY)
            ctx.stroke()

            

            // Наконечник стрелки

            ctx.beginPath()

            ctx.moveTo(arrowX + 18, arrowY)
            ctx.lineTo(arrowX + 12, arrowY - 3)
            ctx.lineTo(arrowX + 12, arrowY + 3)
            ctx.closePath()

            ctx.fill()

          } else {

            // Нагрузка влево

            ctx.beginPath()

            ctx.moveTo(arrowX, arrowY)

            ctx.lineTo(arrowX - 18, arrowY)
            ctx.stroke()

            

            // Наконечник стрелки

            ctx.beginPath()

            ctx.moveTo(arrowX - 18, arrowY)
            ctx.lineTo(arrowX - 12, arrowY - 3)
            ctx.lineTo(arrowX - 12, arrowY + 3)
            ctx.closePath()

            ctx.fill()

          }

        }

        

        // Подпись нагрузки

        ctx.fillText(`${forceValue}q`, rodCenterX, arrowY - 15)
      }
    }
  })
  
  // Рассчитываем позиции розовых разделительных линий
  const dividerPositions = []
  let currentDividerX = originX
  props.rods.forEach((rod, index) => {
    const L = Number(rod.L)
    const rodWidth = L * unitPxPerMeter * scaleX
    dividerPositions.push(currentDividerX)
    currentDividerX += rodWidth
  })
  dividerPositions.push(currentDividerX) // последняя линия в конце
  

  // Рисуем эпюру продольных сил Nx

  const nxY = constructionHeight + margin + epureHeight / 2

  drawLongitudinalForceEpure(ctx, forces, rodLengths, originX, nxY, epureHeight, unitPxPerMeter * scaleX, maxForce, '#ef4444', 'Nx [qL]', dividerPositions, true)
  

  // Рисуем эпюру напряжений σx

  const sigmaY = constructionHeight + margin + epureHeight + epureHeight / 2

  drawStressEpure(ctx, stresses, rodLengths, originX, sigmaY, epureHeight, unitPxPerMeter * scaleX, maxStress, '#f59e0b', 'σx [qL/A]', dividerPositions, false)
  

  // Рисуем эпюру перемещений ux пипец 2

  const uxY = constructionHeight + margin + 2 * epureHeight + epureHeight / 2

  drawDisplacementEpureNew(ctx, displacements, rodLengths, originX, uxY, epureHeight, unitPxPerMeter * scaleX, maxDisp, '#3b82f6', 'Ux [qL/EA]', dividerPositions, false)
  
  // Рисуем розовые вертикальные линии-разделители от углов стержней
  ctx.strokeStyle = '#ec6aa0' // розовый цвет
  ctx.lineWidth = 2
  ctx.setLineDash([]) // сплошные линии
  
  let dividerX = originX
  props.rods.forEach((rod, index) => {
    const L = Number(rod.L)
    const A = Number(rod.A)
    const aNum = Number(A)
    const rodHeight = aNum > 0 ? Math.min(aNum, scaleCap) * baseHeightPx / 2 : 20
    const rodWidth = L * unitPxPerMeter * scaleX
    
    // Линия от левого нижнего угла стержня
    const lineStartY = originY + rodHeight / 2 // нижний край стержня
    const lineEndY = height // до самого конца canvas
    
    ctx.beginPath()
    ctx.moveTo(dividerX, lineStartY)
    ctx.lineTo(dividerX, lineEndY)
    ctx.stroke()
    
    dividerX += rodWidth
  })
  
  // Линия от правого нижнего угла последнего стержня
  const lastLineX = originX + rodLengths.reduce((sum, len) => sum + len * unitPxPerMeter * scaleX, 0)
  const lastRod = props.rods[props.rods.length - 1]
  const lastRodHeight = lastRod ? Math.min(Number(lastRod.A), scaleCap) * baseHeightPx / 2 : 20
  const lastLineStartY = originY + lastRodHeight / 2 // нижний край последнего стержня
  const lastLineEndY = height // до самого конца canvas
  
  ctx.beginPath()
  ctx.moveTo(lastLineX, lastLineStartY)
  ctx.lineTo(lastLineX, lastLineEndY)
  ctx.stroke()
}

const drawLongitudinalForceEpure = (ctx, forces, rodLengths, startX, centerY, height, scaleX, maxValue, color, label, dividerPositions, isFirstLane = false) => {
  // Нулевая линия
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(startX, centerY)
  ctx.lineTo(startX + rodLengths.reduce((sum, len) => sum + len * scaleX, 0), centerY)
  ctx.stroke()
  
  
  // Подпись оси белым цветом слева от нолика
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'right'
  ctx.fillText(label, startX - 25, centerY + 4)
  
  // Масштаб для значений
  const scaleY = maxValue > 0 ? (height / 2 - 10) / maxValue : 1
  
  // Рисуем эпюру продольных сил (точки и соединение линиями)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  
  let currentX = startX
  forces.forEach((force, index) => {
    // Точка в начале стержня
    let startY = centerY - force.forceAtStart * scaleY
    // Минимальное расстояние от оси - 2 пикселя
    if (Math.abs(startY - centerY) < 2) {
      startY = force.forceAtStart >= 0 ? centerY - 2 : centerY + 2
    }
    
    ctx.beginPath()
    ctx.arc(currentX, startY, 3, 0, 2 * Math.PI)
    ctx.fill()
    
    // Подпись значения в начале стержня (белый цвет)
    ctx.fillStyle = '#ffffff' // белый цвет
    ctx.font = '10px Arial'
    ctx.textAlign = 'left'
    // Позиционирование справа от розовой линии
    const labelX = dividerPositions[index] + 3
    // Если точка отрицательная - подпись ниже на 3 пикселя, если положительная - выше на 3 пикселя
    const labelY = force.forceAtStart < 0 ? startY + 10 : startY - 10
    ctx.fillText(formatNumber(force.forceAtStart, 2), labelX, labelY)
    ctx.fillStyle = color
    
    // Точка в конце стержня
    const nextX = currentX + rodLengths[index] * scaleX
    let endY = centerY - force.forceAtEnd * scaleY
    // Минимальное расстояние от оси - 2 пикселя
    if (Math.abs(endY - centerY) < 2) {
      endY = force.forceAtEnd >= 0 ? centerY - 2 : centerY + 2
    }
    
    ctx.beginPath()
    ctx.arc(nextX, endY, 3, 0, 2 * Math.PI)
    ctx.fill()
    
    // Подпись значения в конце стержня (белый цвет)
    ctx.fillStyle = '#ffffff' // белый цвет
    ctx.font = '10px Arial'
    ctx.textAlign = 'right'
    // Позиционирование слева от розовой линии
    const endLabelX = dividerPositions[index + 1] - 3
    // Если точка отрицательная - подпись ниже на 3 пикселя, если положительная - выше на 3 пикселя
    const endLabelY = force.forceAtEnd < 0 ? endY + 10 : endY - 10
    ctx.fillText(formatNumber(force.forceAtEnd, 2), endLabelX, endLabelY)
    ctx.fillStyle = color
    
    // Линия между точками
    ctx.beginPath()
    ctx.moveTo(currentX, startY)
    ctx.lineTo(nextX, endY)
    ctx.stroke()
    
    // Перпендикуляры красного цвета через каждые 5 пикселей
    ctx.strokeStyle = '#ef4444' // красный цвет
    ctx.lineWidth = 1
    
    const lineLength = Math.sqrt((nextX - currentX) ** 2 + (endY - startY) ** 2)
    const perpendicularCount = Math.floor(lineLength / 5)
    
    for (let i = 1; i < perpendicularCount; i++) {
      const t = i / perpendicularCount
      const lineX = currentX + (nextX - currentX) * t
      const lineY = startY + (endY - startY) * t
      
      // Перпендикуляр к линии (направление к оси X)
      const perpendicularLength = Math.abs(lineY - centerY)
      if (perpendicularLength > 2) { // только если линия не слишком близко к оси
        ctx.beginPath()
        ctx.moveTo(lineX, lineY)
        ctx.lineTo(lineX, centerY)
        ctx.stroke()
      }
    } //пипец 3
    
    // Возвращаем цвет обратно
    ctx.strokeStyle = color
    
    currentX = nextX
  })
}

const drawStressEpure = (ctx, stresses, rodLengths, startX, centerY, height, scaleX, maxValue, color, label, dividerPositions, isFirstLane = false) => {
  // Нулевая линия
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(startX, centerY)
  ctx.lineTo(startX + rodLengths.reduce((sum, len) => sum + len * scaleX, 0), centerY)
  ctx.stroke()
  
  // Подпись "0" белым цветом слева от нулевой линии - только для первой эпюры
  if (isFirstLane) {
    ctx.fillStyle = '#ffffff'
    ctx.font = '12px Arial'
    ctx.textAlign = 'right'
    ctx.fillText('0', startX - 10, centerY + 4)
  }
  
  // Подпись оси белым цветом слева от нолика
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'right'
  ctx.fillText(label, startX - 25, centerY + 4)
  
  // Масштаб для значений
  const scaleY = maxValue > 0 ? (height / 2 - 10) / maxValue : 1
  
  // Рисуем эпюру напряжений (точки и соединение линиями)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  
  let currentX = startX
  stresses.forEach((stress, index) => {
    // Точка в начале стержня
    let startY = centerY - stress.stressAtStart * scaleY
    // Минимальное расстояние от оси - 2 пикселя
    if (Math.abs(startY - centerY) < 2) {
      startY = stress.stressAtStart >= 0 ? centerY - 2 : centerY + 2
    }
    
    ctx.beginPath()
    ctx.arc(currentX, startY, 3, 0, 2 * Math.PI)
    ctx.fill()
    
    // Подпись значения в начале стержня (белый цвет)
    ctx.fillStyle = '#ffffff' // белый цвет
    ctx.font = '10px Arial'
    ctx.textAlign = 'left'
    // Позиционирование справа от розовой линии
    const labelX = dividerPositions[index] + 3
    // Если точка отрицательная - подпись ниже на 10 пикселей, если положительная - выше на 10 пикселей
    const labelY = stress.stressAtStart < 0 ? startY + 10 : startY - 10
    ctx.fillText(formatNumber(stress.stressAtStart, 2), labelX, labelY)
    ctx.fillStyle = color
    
    // Точка в конце стержня
    const nextX = currentX + rodLengths[index] * scaleX
    let endY = centerY - stress.stressAtEnd * scaleY
    // Минимальное расстояние от оси - 2 пикселя
    if (Math.abs(endY - centerY) < 2) {
      endY = stress.stressAtEnd >= 0 ? centerY - 2 : centerY + 2
    }
    
    ctx.beginPath()
    ctx.arc(nextX, endY, 3, 0, 2 * Math.PI)
    ctx.fill()
    
    // Подпись значения в конце стержня (белый цвет)
    ctx.fillStyle = '#ffffff' // белый цвет
    ctx.font = '10px Arial'
    ctx.textAlign = 'right'
    // Позиционирование слева от розовой линии
    const endLabelX = dividerPositions[index + 1] - 3
    // Если точка отрицательная - подпись ниже на 10 пикселей, если положительная - выше на 10 пикселей
    const endLabelY = stress.stressAtEnd < 0 ? endY + 10 : endY - 10
    ctx.fillText(formatNumber(stress.stressAtEnd, 2), endLabelX, endLabelY)
    ctx.fillStyle = color
    
    // Линия между точками
    ctx.beginPath()
    ctx.moveTo(currentX, startY)
    ctx.lineTo(nextX, endY)
    ctx.stroke()
    
    // Перпендикуляры оранжевого цвета через каждые 5 пикселей
    ctx.strokeStyle = '#f59e0b' // оранжевый цвет
    ctx.lineWidth = 1
    
    const lineLength = Math.sqrt((nextX - currentX) ** 2 + (endY - startY) ** 2)
    const perpendicularCount = Math.floor(lineLength / 5)
    
    for (let i = 1; i < perpendicularCount; i++) {
      const t = i / perpendicularCount
      const lineX = currentX + (nextX - currentX) * t
      const lineY = startY + (endY - startY) * t
      
      // Перпендикуляр к линии (направление к оси X)
      const perpendicularLength = Math.abs(lineY - centerY)
      if (perpendicularLength > 2) { // только если линия не слишком близко к оси
        ctx.beginPath()
        ctx.moveTo(lineX, lineY)
        ctx.lineTo(lineX, centerY)
        ctx.stroke()
      }
    }
    
    // Возвращаем цвет обратно
    ctx.strokeStyle = color
    
    currentX = nextX
  })
}



const drawEpure = (ctx, values, rodLengths, startX, centerY, height, scaleX, maxValue, color, label) => {

  // Нулевая линия

  ctx.strokeStyle = '#64748b'

  ctx.lineWidth = 1

  ctx.beginPath()

  ctx.moveTo(startX, centerY)

  ctx.lineTo(startX + rodLengths.reduce((sum, len) => sum + len * scaleX, 0), centerY)

  ctx.stroke()


  
  // Подпись "0" белым цветом слева от нулевой линии
  ctx.fillStyle = '#ffffff'
  ctx.font = '12px Arial'
  ctx.textAlign = 'right'
  ctx.fillText('0', startX - 10, centerY + 4)
  
  // Подпись оси белым цветом слева от нолика
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'right'
  ctx.fillText(label, startX - 25, centerY + 4)
  

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

    ctx.fillText(formatNumber(value.value, 2), currentX + rodWidth / 2, valueY - 5)
    ctx.fillStyle = color

    

    currentX += rodWidth

  })

}

// Helper functions for parabola computation
const uxAt = (x, params) => {
  const { U0, UL, L, q, E, A } = params
  
  // Защита от деления на ноль
  const eps = 1e-12
  if (Math.abs(L) < eps || Math.abs(E) < eps || Math.abs(A) < eps) {
    console.debug({ id: params.id, message: 'Zero division protection in uxAt', L, E, A })
    return U0 + ((UL - U0) * x / Math.max(L, eps))  // линейная интерполяция
  }
  
  return U0 + ((UL - U0) / L) * x + (q * L / (2 * E * A)) * x  - (q / (2 * E * A)) * x * x
}

const uxVertex = (params) => {
  const { U0, UL, L, q, E, A } = params
  
  const eps = 1e-12
  
  // Защита от деления на ноль
  if (Math.abs(L) < eps || Math.abs(E) < eps || Math.abs(A) < eps) {
    console.debug({ id: params.id, message: 'Zero division protection', L, E, A })
    return null
  }
  
  if (Math.abs(q) < eps) {
    return null // Linear case, no vertex
  }
  
  // Вычисляем вершину в "сырых" единицах той же формулы, что рисует кривую
  // u(x) = U0 + ((UL - U0)/L) * x + (q*L/(2EA)) * x - (q/(2EA)) * x^2
  // Производная: du/dx = ((UL - U0)/L) + (q*L/(2EA)) - (q/(EA)) * x
  // В вершине du/dx = 0:
  const a = -q / (2 * E * A)
  const b = ((UL - U0) / L) + (q * L) / (2 * E * A)
  const xv = -b / (2 * a)  // локальная координата в метрах относительно начала стержня
  
  // Проверяем, находится ли вершина в пределах данного стержня
  if (xv <= 0 || xv >= L) {
    console.debug({ id: params.id, message: 'Vertex not in this element', xv, L })
    return null // не в этом стержне — не рисуем здесь
  }
  
  // Вычисляем значение смещения в вершине
  const uv = uxAt(xv, params)
  
  console.debug({ id: params.id, xv, uv, L, U0, UL, q })
  
  return { x: xv, u: uv }
}

const sampleUxParabola = (params, n) => {
  const { L } = params
  const samples = []
  
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * L
    const u = uxAt(x, params)
    samples.push({ x, u })
  }
  
  return samples
}

// Утилиты для аппроксимации параболической функции
const fitQuadratic = (points) => {
  // Σ обозначения
  let n = points.length
  let Sx = 0, Sx2 = 0, Sx3 = 0, Sx4 = 0
  let Sy = 0, Sxy = 0, Sx2y = 0

  for (const p of points) {
    const x = p.x, y = p.y
    const x2 = x*x, x3 = x2*x, x4 = x2*x2
    Sx  += x;    Sx2 += x2;   Sx3 += x3;   Sx4 += x4
    Sy  += y;    Sxy += x*y;  Sx2y += x2*y
  }

  // Решаем систему для a,b,c
  // | Sx4  Sx3  Sx2 | | a | = | Sx2y |
  // | Sx3  Sx2  Sx  | | b |   | Sxy  |
  // | Sx2  Sx   n   | | c |   | Sy   |
  const det3 = (a,b,c,d,e,f,g,h,i) => {
    return a*(e*i - f*h) - b*(d*i - f*g) + c*(d*h - e*g)
  }

  const D  = det3(Sx4,Sx3,Sx2,  Sx3,Sx2,Sx,  Sx2,Sx,n)
  if (Math.abs(D) < 1e-12) return {a:0,b:0,c:0,r2:0}

  const Da = det3(Sx2y,Sx3,Sx2,  Sxy,Sx2,Sx,  Sy,Sx,n)
  const Db = det3(Sx4,Sx2y,Sx2,  Sx3,Sxy,Sx,  Sx2,Sy,n)
  const Dc = det3(Sx4,Sx3,Sx2y,  Sx3,Sx2,Sxy, Sx2,Sx,Sy)

  const a = Da / D, b = Db / D, c = Dc / D

  // R^2
  const ymean = Sy / n
  let ssTot = 0, ssRes = 0
  for (const p of points) {
    const yhat = a*p.x*p.x + b*p.x + c
    ssTot += (p.y - ymean)**2
    ssRes += (p.y - yhat)**2
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes/ssTot

  return {a,b,c,r2}
}

const vertexOfParabola = (a, b, c) => {
  if (Math.abs(a) < 1e-12) return null
  const xv = -b/(2*a)
  const yv = c - (b*b)/(4*a)
  return {x:xv, y:yv}
}

const shouldAlertOnce = (elementId, pts) => {
  const key = elementId + ':' + pts.length + ':' + (pts[0]?.x ?? 0) + ':' + (pts[pts.length-1]?.x ?? 0)
  if (lastAlertKey.value === key) return false
  lastAlertKey.value = key
  return true
}

const drawDisplacementEpureNew = (ctx, displacements, rodLengths, startX, centerY, height, scaleX, maxValue, color, label, dividerPositions, isFirstLane = false) => {
  // Нулевая линия
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(startX, centerY)
  ctx.lineTo(startX + rodLengths.reduce((sum, len) => sum + len * scaleX, 0), centerY)
  ctx.stroke()
  
  // Подпись "0" белым цветом слева от нулевой линии - только для первой эпюры
  if (isFirstLane) {
    ctx.fillStyle = '#ffffff'
    ctx.font = '12px Arial'
    ctx.textAlign = 'right'
    ctx.fillText('0', startX - 10, centerY + 4)
  }
  
  // Подпись оси белым цветом слева от нолика
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'right'
  ctx.fillText(label, startX - 25, centerY + 4)
  
  // Масштаб для значений
  const scaleY = maxValue > 0 ? (height / 2 - 10) / maxValue : 1
  
  // Массив занятых областей для избежания перекрытий подписей
  const takenRects = []
  
  // Рисуем эпюру перемещений
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  
  let currentX = startX
  displacements.forEach((disp, index) => {
    // Точка в начале стержня
    let startY = centerY - disp * scaleY
    // Минимальное расстояние от оси - 2 пикселя
    if (Math.abs(startY - centerY) < 2) {
      startY = disp >= 0 ? centerY - 2 : centerY + 2
    }
    
    ctx.beginPath()
    ctx.arc(currentX, startY, 3, 0, 2 * Math.PI)
    ctx.fill()
    
    // Подпись значения в начале стержня (белый цвет)
    ctx.fillStyle = '#ffffff' // белый цвет
    ctx.font = '10px Arial'
    ctx.textAlign = 'left'
    // Позиционирование справа от розовой линии
    const labelX = dividerPositions[index] + 3
    // Если точка отрицательная - подпись ниже на 10 пикселей, если положительная - выше на 10 пикселей
    const labelY = disp < 0 ? startY + 10 : startY - 10
    ctx.fillText(formatNumber(disp, 2), labelX, labelY)
    ctx.fillStyle = color
    
    // Обработка элемента между узлами
    if (index < displacements.length - 1) {
      const nextDisp = displacements[index + 1]
      const nextX = currentX + rodLengths[index] * scaleX
      let nextDispY = centerY - nextDisp * scaleY
      // Минимальное расстояние от оси - 2 пикселя
      if (Math.abs(nextDispY - centerY) < 2) {
        nextDispY = nextDisp >= 0 ? centerY - 2 : centerY + 2
      }
      
      // Точка в конце стержня
      ctx.beginPath()
      ctx.arc(nextX, nextDispY, 3, 0, 2 * Math.PI)
      ctx.fill()
      
      // Подпись значения в конце стержня (белый цвет) - только если не последний узел
      if (index < displacements.length - 1) {
        ctx.fillStyle = '#ffffff' // белый цвет
        ctx.font = '10px Arial'
        ctx.textAlign = 'right'
        // Позиционирование слева от розовой линии
        const endLabelX = dividerPositions[index + 1] - 3
        // Если точка отрицательная - подпись ниже на 10 пикселей, если положительная - выше на 10 пикселей
        const endLabelY = nextDisp < 0 ? nextDispY + 10 : nextDispY - 10
        ctx.fillText(formatNumber(nextDisp, 2), endLabelX, endLabelY)
        ctx.fillStyle = color
      }
      
      // Проверяем наличие распределенной нагрузки на элементе
      const rodIndex = index
      const rodLoad = props.rodLoads.find(load => load.rodNumber === rodIndex + 1)
      const qp = rodLoad ? Number(rodLoad.forceX) : 0
      
      if (Math.abs(qp) > 1e-10) {
        // Рисуем параболу для элемента с распределенной нагрузкой
        const rod = props.rods[rodIndex]
        const Lp = Number(rod.L)
        const Ep = Number(rod.E)
        const Ap = Number(rod.A)
        
        const params = {
          U0: disp,
          UL: nextDisp,
          L: Lp,
          q: qp,
          E: Ep,
          A: Ap
        }
        
        // Добавляем id к параметрам для логирования
        params.id = rodIndex + 1
        
        const vertex = uxVertex(params)
        const samples = sampleUxParabola(params, 128)
        
        // Проверка на параболичность
        const eps = 1e-12
        if (Math.abs(qp) < eps) {
          // Линейная эпюра, не парабола
          if (shouldAlertOnce(rodIndex + 1, samples)) {
            alert('Эпюра смещений не является параболой (q≈0)')
          }
        } else {
          // Всегда считаем параболой и показываем алерт с вершиной
          if (vertex && shouldAlertOnce(rodIndex + 1, samples)) {
            const xv = Number(vertex.x.toFixed(3))
            const uv = Number(vertex.u.toFixed(3))
            alert(`Парабола смещений: вершина x = ${xv}, Ux = ${uv}`)
          }
        }
        
        // Рисуем параболу с помощью множества точек
        ctx.beginPath()
        for (let i = 0; i < samples.length; i++) {
          const { x, u } = samples[i]
          const canvasX = currentX + (x / Lp) * rodLengths[index] * scaleX
          const canvasY = centerY - u * scaleY
          
          if (i === 0) {
            ctx.moveTo(canvasX, canvasY)
          } else {
            ctx.lineTo(canvasX, canvasY)
          }
        }
        ctx.stroke()
        
        // Рисуем вершину параболы если она есть в этом элементе
        if (vertex) {
          // vertex содержит локальные координаты (x в метрах, u в сырых единицах)
          const xLocal = vertex.x  // локальная координата в метрах (0 до L)
          const uRaw = vertex.u    // смещение в тех же единицах, что и ось Ux
          
          // Преобразуем в экранные координаты ТОЧНО так же, как точки кривой
          const vertexX = currentX + (xLocal / Lp) * rodLengths[index] * scaleX
          const vertexY = centerY - uRaw * scaleY
          const axisY = centerY   // ось Ux: y=0
          
          // Константы оформления
          const VERTEX_COLOR = '#ff66cc'  // розовый
          const DOT_R = 4                 // радиус маркера
          const LINE_ALPHA = 0.7          // прозрачность вертикали
          const BELOW_OFFSET = 14         // отступ подписи ниже кривой (px)
          const AXIS_CLEARANCE = 8        // минимальный зазор от оси X (px)
          
          // 1) Маркер без свечения
          ctx.save()
          ctx.fillStyle = VERTEX_COLOR
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(vertexX, vertexY, DOT_R, 0, 2*Math.PI)
          ctx.fill()
          ctx.stroke()
          ctx.restore()
          
          // 2) Вертикальная линия к оси X
          ctx.save()
          ctx.strokeStyle = VERTEX_COLOR
          ctx.globalAlpha = LINE_ALPHA
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(vertexX, vertexY)
          ctx.lineTo(vertexX, axisY)
          ctx.stroke()
          ctx.restore()
          
          // 3) Бейдж-подпись (Ux*, x*) - всегда ниже кривой
          ctx.font = '10px Inter, Arial'
          ctx.textAlign = 'center'
          const line1 = `Ux* = ${formatNumber(uRaw, 2)}`
          const line2 = `x* = ${formatNumber(xLocal, 2)} м`
          const textW = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width)
          const badgeW = Math.ceil(textW) + 14
          const badgeH = 12*2 + 10
          
          // Базовая позиция — прямо под кривой
          let badgeX = vertexX - badgeW/2
          let badgeY = vertexY + BELOW_OFFSET
          
          // Не задеваем ось X: бейдж должен целиком помещаться выше axisY - AXIS_CLEARANCE
          const maxY = axisY - AXIS_CLEARANCE - badgeH
          if (badgeY > maxY) badgeY = maxY
          
          // Границы канваса
          if (badgeX < 0) badgeX = 0
          const maxX = ctx.canvas.width - badgeW
          if (badgeX > maxX) badgeX = maxX
          
          // Отрисовка бейджа
          ctx.save()
          ctx.globalAlpha = 0.92
          ctx.fillStyle = 'rgba(31,31,42,0.85)'  // тёмный полупрозрачный фон
          ctx.strokeStyle = VERTEX_COLOR + '80'   // розовая рамка
          ctx.lineWidth = 1
          roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 7)
          ctx.fill()
          ctx.stroke()
          ctx.globalAlpha = 1
          ctx.fillStyle = '#ffdff3'  // мягкий светлый текст
          ctx.fillText(line1, badgeX + badgeW/2, badgeY + 16)
          ctx.fillText(line2, badgeX + badgeW/2, badgeY + 28)
          ctx.restore()
        }
        
        // Перпендикуляры синего цвета через каждые 5 пикселей
        ctx.strokeStyle = '#3b82f6' // синий цвет
        ctx.lineWidth = 1
        
        const lineLength = Math.sqrt((nextX - currentX) ** 2 + (nextDispY - startY) ** 2)
        const perpendicularCount = Math.floor(lineLength / 5)
        
        for (let i = 1; i < perpendicularCount; i++) {
          const t = i / perpendicularCount
          const x_in_world = t * params.L  // координата в мировых единицах
          const lineX = currentX + (nextX - currentX) * t
          const lineY = centerY - uxAt(x_in_world, params) * scaleY
          
          // Вертикальный отрезок от кривой к оси X (строго вертикально)
          const perpendicularLength = Math.abs(lineY - centerY)
          if (perpendicularLength > 2) {
            ctx.beginPath()
            ctx.moveTo(lineX, lineY)
            ctx.lineTo(lineX, centerY)  // строго вертикально к оси
            ctx.stroke()
          }
        }
        
        // Возвращаем цвет обратно
        ctx.strokeStyle = color
      } else {
        // Линейная интерполяция для элементов без распределенной нагрузки
      ctx.beginPath()
      ctx.moveTo(currentX, startY)
      ctx.lineTo(nextX, nextDispY)
      ctx.stroke()
      
      // Перпендикуляры синего цвета через каждые 5 пикселей
      ctx.strokeStyle = '#3b82f6' // синий цвет
      ctx.lineWidth = 1
      
      const lineLength = Math.sqrt((nextX - currentX) ** 2 + (nextDispY - startY) ** 2)
      const perpendicularCount = Math.floor(lineLength / 5)
      
      for (let i = 1; i < perpendicularCount; i++) {
        const t = i / perpendicularCount
        const lineX = currentX + (nextX - currentX) * t
        const lineY = startY + (nextDispY - startY) * t
        
        // Перпендикуляр к линии (направление к оси X)
        const perpendicularLength = Math.abs(lineY - centerY)
        if (perpendicularLength > 2) { // только если линия не слишком близко к оси
          ctx.beginPath()
          ctx.moveTo(lineX, lineY)
          ctx.lineTo(lineX, centerY)
          ctx.stroke()
        }
      }
      
      // Возвращаем цвет обратно
      ctx.strokeStyle = color
      }
      
      currentX = nextX
    }
  })
}



const drawDisplacementEpure = (ctx, displacements, rodLengths, startX, centerY, height, scaleX, maxValue, color, label) => {

  // Нулевая линия

  ctx.strokeStyle = '#64748b'

  ctx.lineWidth = 1

  ctx.beginPath()

  ctx.moveTo(startX, centerY)

  ctx.lineTo(startX + rodLengths.reduce((sum, len) => sum + len * scaleX, 0), centerY)

  ctx.stroke()


  
  // Подпись "0" белым цветом слева от нулевой линии
  ctx.fillStyle = '#ffffff'
  ctx.font = '12px Arial'
  ctx.textAlign = 'right'
  ctx.fillText('0', startX - 10, centerY + 4)
  
  // Подпись оси белым цветом слева от нолика
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'right'
  ctx.fillText(label, startX - 25, centerY + 4)
  

  // Масштаб для значений

  const scaleY = maxValue > 0 ? (height / 2 - 10) / maxValue : 1

  

  // Рисуем эпюру перемещений (линейная интерполяция между узлами)

  ctx.strokeStyle = color

  ctx.fillStyle = color

  ctx.lineWidth = 2

  

  let currentX = startX

  displacements.forEach((disp, index) => {

    let dispY = centerY - disp * scaleY
    // Минимальное расстояние от оси - 2 пикселя
    if (Math.abs(dispY - centerY) < 2) {
      dispY = disp >= 0 ? centerY - 2 : centerY + 2
    }
    

    // Точка перемещения

    ctx.beginPath()

    ctx.arc(currentX, dispY, 3, 0, 2 * Math.PI)

    ctx.fill()

    

    // Подпись значения

    ctx.fillStyle = '#64748b'

    ctx.font = '10px Arial'

    ctx.textAlign = 'center'

    ctx.fillText(formatNumber(disp, 2), currentX, dispY - 8)
    ctx.fillStyle = color

    

    // Линия к следующему узлу

    if (index < displacements.length - 1) {

      const nextDisp = displacements[index + 1]

      const nextX = currentX + rodLengths[index] * scaleX

      let nextDispY = centerY - nextDisp * scaleY
      // Минимальное расстояние от оси - 2 пикселя
      if (Math.abs(nextDispY - centerY) < 2) {
        nextDispY = nextDisp >= 0 ? centerY - 2 : centerY + 2
      }
      

      ctx.beginPath()

      ctx.moveTo(currentX, dispY)

      ctx.lineTo(nextX, nextDispY)

      ctx.stroke()

      

      currentX = nextX

    }

  })

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

      maxForce: Math.max(...longitudinalForces.value.map(f => Math.max(Math.abs(f.forceAtStart), Math.abs(f.forceAtEnd))), 0)

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

    report.push(`  A = ${formatNumber(rod.A)} м²`)
    report.push(`  E = ${formatNumber(rod.E)} Па`)
    report.push(`  [σ] = ${formatNumber(rod.sigma)} Па`)
    report.push('')

  })

  

  report.push('РЕЗУЛЬТАТЫ РАСЧЁТА:')

  report.push('-'.repeat(30))

  report.push('Перемещения узлов:')

  normalizedResults.value.forEach((result, index) => {

    report.push(`  Узел ${result.node}: u = ${formatNumber(result.displacement)} м`)
  })

  report.push('')

  

  report.push('Продольные силы:')

  longitudinalForces.value.forEach((force, index) => {

    report.push(`  Стержень ${force.rodNumber}: Nx = ${formatNumber(force.force)} Н`)
  })

  report.push('')

  

  report.push('Нормальные напряжения:')

  normalStresses.value.forEach((stress, index) => {

    report.push(`  Стержень ${stress.rodNumber}: Ox = ${formatNumber(stress.stress)} Па (${stress.status})`)
  })

  report.push('')

  

  report.push('СВОДНАЯ ИНФОРМАЦИЯ:')

  report.push('-'.repeat(30))

  report.push(`Количество стержней: ${rodsCount.value}`)

  report.push(`Количество узлов: ${nodesCount.value}`)

  report.push(`Максимальное перемещение: ${formatNumber(maxDisplacement.value)} м`)
  report.push(`Максимальное напряжение: ${formatNumber(maxStress.value)} Па`)
  report.push(`Максимальная сила: ${formatNumber(Math.max(...longitudinalForces.value.map(f => Math.abs(f.force)), 0))} Н`)
  

  return report.join('\n')

}

// Вспомогательные функции для работы с прямоугольниками и бейджами

function rectsIntersect(a, b) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y)
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w/2, h/2)
  ctx.beginPath()
  ctx.moveTo(x+rr, y)
  ctx.lineTo(x+w-rr, y)
  ctx.quadraticCurveTo(x+w, y, x+w, y+rr)
  ctx.lineTo(x+w, y+h-rr)
  ctx.quadraticCurveTo(x+w, y+h, x+w-rr, y+h)
  ctx.lineTo(x+rr, y+h)
  ctx.quadraticCurveTo(x, y+h, x, y+h-rr)
  ctx.lineTo(x, y+rr)
  ctx.quadraticCurveTo(x, y, x+rr, y)
  ctx.closePath()
}

function drawBadge(ctx, x, y, w, h, lines) {
  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.fillStyle = '#1f1f2acc'
  ctx.strokeStyle = '#ff6b6b80'
  ctx.lineWidth = 1
  roundRect(ctx, x, y, w, h, 7)
  ctx.fill(); ctx.stroke()
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffdede'
  ctx.font = '10px Inter, Arial'
  ctx.textAlign = 'center'
  const lineH = 12
  for (let i=0;i<lines.length;i++) {
    ctx.fillText(lines[i], x + w/2, y + 6 + (i+1)*lineH)
  }
  ctx.restore()
}

/**
 * sampleFn(sx,sy) -> true если точка внутри рамки близко к кривой (для штрафа).
 * Передай сюда свою функцию семплинга графика, если есть. Пока вернем false.
 */
function makeSampleFn() {
  return () => false
}

function pickLabelPos(ctx, vx, vy, badgeW, badgeH, taken, sampleFn) {
  const pad = 14
  const cands = [
    { x: vx - badgeW/2,     y: vy - pad - badgeH },          // сверху по центру
    { x: vx - badgeW/2,     y: vy + pad },                   // снизу по центру
    { x: vx + pad,          y: vy - pad - badgeH },         // справа-сверху
    { x: vx - pad - badgeW, y: vy + pad },                   // слева-снизу
  ]
  const W = ctx.canvas.width, H = ctx.canvas.height
  function cost(r) {
    let c = 0
    if (r.x < 0 || r.y < 0 || r.x + r.w > W || r.y + r.h > H) c += 1000
    for (const t of taken) if (rectsIntersect(r,t)) c += 500
    const samples = 6
    for (let i=0;i<samples;i++){
      const sx = r.x + (i/(samples-1))*r.w
      const sy = r.y + r.h/2
      if (sampleFn(sx,sy)) c += 50
    }
    // лёгкое предпочтение «ниже и правее»
    if (r.x < vx) c += 5
    if (r.y < vy) c += 3
    return c
  }
  let best = {x:vx+pad, y:vy+pad, w:badgeW, h:badgeH}, bestC = Infinity
  for (const p of cands) {
    const r = { x:p.x, y:p.y, w:badgeW, h:badgeH }
    const cc = cost(r)
    if (cc < bestC) { bestC = cc; best = r }
  }
  return best
}


// Обновляем графики при изменении результатов

onMounted(() => {
  nextTick(() => {
    resizeCanvas()
    drawEpureChart()
    updateSectionResults()

    updateMemberTable()

    // Настраиваем ResizeObserver для отслеживания изменений размера контейнера
    if (chartContainer.value && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        nextTick(() => {
          resizeCanvas()
          drawEpureChart()
        })
      })
      resizeObserver.observe(chartContainer.value)
    }
  })
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})



// Следим за изменениями результатов и перерисовываем графики

import { watch } from 'vue'

watch(() => props.calculationResults, () => {
  nextTick(() => {
    resizeCanvas()
    drawEpureChart()
    updateSectionResults()
    updateMemberTable()
  })
}, { deep: true })

// Следим за переключением вкладки графиков и перерисовываем график
watch(() => activeTab.value, (newTab) => {
  if (newTab === 'charts') {
    nextTick(() => {
      resizeCanvas()
      drawEpureChart()
    })
  }
})

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

/* Tab Navigation Styles */
.tab-navigation {
  display: flex;
  background: #0f172a;
  border-bottom: 1px solid #334155;
  padding: 8px;
  margin: 0 24px;
  border-radius: 8px;
  gap: 24px;
}

.tab-btn {
  flex: 1;
  background: #ff4fa3;
  border: none;
  color: #ffffff;
  padding: 16px 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
  border-radius: 6px;
}

.tab-btn:hover {
  background: #ff6bb3;
  color: #ffffff;
}

.tab-btn.active {
  background: #ff6bb3;
  color: #ffffff;
  border-bottom-color: #ffffff;
}

.tab-content {
  padding: 0;
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



.tri-wrap {
  max-width: 720px;
  margin: 0 auto;
}

.tri-wrap table {
  width: 100%;
  table-layout: fixed;
}

.results-section {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px 16px;
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



.chart-section {
  overflow: visible;
}

.chart-container {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  justify-content: center;
  overflow: visible;
  z-index: 2;
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



/* Стили для лога Гаусса */

.gauss-log-container {

  background: #1e293b;

  border: 1px solid #334155;

  border-radius: 6px;

  padding: 16px;

  max-height: 300px;

  overflow-y: auto;

}



.gauss-log {

  font-family: 'Courier New', monospace;

  font-size: 12px;

  line-height: 1.4;

}



.gauss-step {

  color: #cbd5e1;

  margin-bottom: 4px;

  padding: 2px 0;

}



.gauss-step:hover {

  background: rgba(255, 255, 255, 0.05);

  border-radius: 3px;

  padding: 2px 6px;

}



/* Стили для матрицы */

.matrix-container {

  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 20px;

}



.matrix-section h4 {

  color: #f1f5f9;

  margin: 0 0 12px 0;

  font-size: 14px;

  font-weight: 600;

}



.matrix-display {

  background: #1e293b;

  border: 1px solid #334155;

  border-radius: 6px;

  padding: 12px;

  font-family: 'Courier New', monospace;

  font-size: 11px;

}



.matrix-row {

  display: flex;

  gap: 8px;

  margin-bottom: 4px;

}



.matrix-element {

  color: #cbd5e1;

  min-width: 80px;

  text-align: center;

  padding: 2px 4px;

  background: rgba(255, 255, 255, 0.05);

  border-radius: 3px;

}



.vector-display {

  background: #1e293b;

  border: 1px solid #334155;

  border-radius: 6px;

  padding: 12px;

  font-family: 'Courier New', monospace;

  font-size: 11px;

}



.vector-element {

  color: #cbd5e1;

  margin-bottom: 4px;

  padding: 2px 4px;

  background: rgba(255, 255, 255, 0.05);

  border-radius: 3px;

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

.member-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
}

.member-selector label {
  color: #94a3b8;
  font-size: 14px;
}

.member-selector select {
  padding: 8px 12px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 4px;
  color: #f1f5f9;
  font-size: 14px;
}


.member-sample-table {
  table-layout: fixed;
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #1e293b;
  border-radius: 6px;
  overflow: hidden;
}

.member-sample-table thead {
  position: sticky;
  top: 0;
  background: #334155;
  z-index: 1;
}

.member-sample-table th {
  background: #334155;
  color: #f1f5f9;
  padding: 10px 14px;
  font-weight: 600;
  font-size: 14px;
}

.member-sample-table td {
  padding: 10px 14px;
  border-top: 1px solid #334155;
  color: #cbd5e1;
  font-size: 14px;
}

.member-sample-table tbody {
  max-height: 500px;
  overflow-y: auto;
}

.member-sample-table .even-row {
  background: #1e293b;
}

.member-sample-table tr:not(.even-row) {
  background: #0f172a;
}

.member-sample-table tr:hover {
  background: #334155;
}

.col-text {
  text-align: left;
}

.col-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.status-icon {
  text-align: center;
  width: 40px;
}

.status-ok {
  color: #10b981;
  font-weight: bold;
  font-size: 16px;
}

.status-error {
  color: #ef4444;
  font-weight: bold;
  font-size: 16px;
}

.validation-message {
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
  font-style: italic;
}

.btn-export {
  background: #ff4fa3;
  color: #fff;
  border: none;
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-export:hover:not(:disabled) {
  background: #e63e8a;
}

.btn-export:disabled {
  opacity: 0.6;
  cursor: default;
}

</style>