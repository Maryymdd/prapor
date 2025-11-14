<template>
  <div ref="stageContainerRef" class="stage-container"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, reactive, ref, defineExpose } from 'vue'

// Konva подключена через CDN и доступна как window.Konva
const Konva = window.Konva

const emit = defineEmits(['update:stats'])

const stageContainerRef = ref(null)
const LIMITS = { minScale: 0.2, maxScale: 5 }
const state = reactive({
  stage: null,
  layer: null,
  shapes: [],
  unitPxPerMeter: 120, // 1 метр = 120 пикселей (текущая длина базового прямоугольника)
  oneCmPx: null, // кэш для 1 см в пикселях
})

function computeSize() {
  const el = stageContainerRef.value
  if (!el) return { width: 300, height: 300 }
  const rect = el.getBoundingClientRect()
  return { width: Math.max(200, rect.width), height: Math.max(200, rect.height) }
}

function resizeStage() {
  const { width, height } = computeSize()
  if (state.stage) {
    state.stage.size({ width, height })
  }
  emit('update:stats', { width, height, count: state.shapes.length })
}

function initKonva() {
  if (!stageContainerRef.value || !Konva) return
  const { width, height } = computeSize()
  const stage = new Konva.Stage({
    container: stageContainerRef.value,
    width,
    height,
    draggable: true, // перетаскивание холста
  })
  const layer = new Konva.Layer()
  stage.add(layer)

  state.stage = stage
  state.layer = layer

  resizeStage()
}


function measureOneCmInPx() {
  if (state.oneCmPx && state.oneCmPx > 0) return state.oneCmPx
  const el = document.createElement('div')
  el.style.position = 'absolute'
  el.style.visibility = 'hidden'
  el.style.width = '1cm'
  el.style.height = '1cm'
  document.body.appendChild(el)
  const px = el.getBoundingClientRect().width || 37.795
  document.body.removeChild(el)
  state.oneCmPx = px
  return px
}

function addRect(params = {}) {
  if (!state.layer || !Konva) return
  const { L = 1, A = 80, E = 210000, sigma = 240 } = params
  const leftFx = Number(params.leftNodeFx || 0)
  const rightFx = Number(params.rightNodeFx || 0)
  const leftFy = Number(params.leftNodeFy || 0)
  const rightFy = Number(params.rightNodeFy || 0)
  const rodQx = Number(params.rodQx || 0)
  const rodQy = Number(params.rodQy || 0)
 

  const stageW = state.stage ? state.stage.width() : 1200
  const stageH = state.stage ? state.stage.height() : 800

  // масштаб: ширина = L метров * unitPxPerMeter
  let width = Number(L) * state.unitPxPerMeter
  // Интерпретация A:
  //  - для всех A > 0 считаем высоту как A * baseHeightPx,
  //  - но ограничиваем масштаб сверху значением 7 * baseHeightPx
  const baseHeightPx = 80
  const aNum = Number(A)
  const scaleCap = 7
  let height = aNum > 0 ? Math.min(aNum, scaleCap) * baseHeightPx : 0
  width = Math.max(10, Math.min(width || 0, stageW - 40))
  height = Math.max(10, Math.min(height || 0, stageH - 40))

  // Координаты по умолчанию: левая грань в начале координат (0,0),
  // вертикальный центр стержня лежит на оси X (по центру контейнера)
  const oneCmPx = measureOneCmInPx()
  const originX = oneCmPx * 2 // 2 клетки слева
  const originY = stageH / 2 // по центру по вертикали

  // Поддержка переопределения координат через параметры
  // params.x — x верхнего левого угла
  // params.y — y верхнего левого угла
  // params.bottomY — y нижнего левого угла
  let xTopLeft
  if (Number.isFinite(params.x)) {
    xTopLeft = Number(params.x)
  } else if (state.shapes.length > 0) {
    const prev = state.shapes[state.shapes.length - 1]
    xTopLeft = prev.x() + prev.width() // следующий вплотную к предыдущему
  } else {
    xTopLeft = originX
  }

  const yTopLeft = Number.isFinite(params.bottomY)
    ? Number(params.bottomY) - height
    : (Number.isFinite(params.y) ? Number(params.y) : (originY - height / 2))

  const rect = new Konva.Rect({
    x: xTopLeft,
    y: yTopLeft,
    width,
    height,
    fill: '#4f9cf9',
    stroke: '#1f5fbf',
    strokeWidth: 2,
    draggable: false,
  })
  rect.setAttr('meta', { L: Number(L), A: Number(A), E: Number(E), sigma: Number(sigma) })
  state.layer.add(rect)
  state.shapes.push(rect)

  // Добавляем номер стержня (розовый круг) — строго по центру стержня
  const rodNumber = state.shapes.length
  const rodCircleX = xTopLeft + width / 2
  const rodCircleY = yTopLeft + height / 2
  const rodRadius = 12
  const rodText = new Konva.Text({
    x: rodCircleX - rodRadius,
    y: rodCircleY - rodRadius,
    width: rodRadius * 2,
    height: rodRadius * 2,
    text: rodNumber.toString(),
    fontSize: 14,
    fontFamily: 'Arial',
    fill: '#ffffff',
    align: 'center',
    verticalAlign: 'middle',
  })
  const rodCircle = new Konva.Circle({
    x: rodCircleX,
    y: rodCircleY,
    radius: rodRadius,
    fill: '#ec6aa0', 
    stroke: '#b44f7a',
    strokeWidth: 2,
  })
  state.layer.add(rodCircle)
  state.layer.add(rodText)

  // Добавляем узлы (фиолетовые номера) слева и справа
  const nodeLeftNumber = rodNumber
  const nodeRightNumber = rodNumber + 1

  // Определяем, соприкасается ли текущий стержень с предыдущим (для узла между ними)
  const prevRect = state.shapes.length >= 2 ? state.shapes[state.shapes.length - 2] : null
  const isAdjacentToPrev = !!prevRect && Math.abs((prevRect.x() + prevRect.width()) - xTopLeft) < 0.5

  // Если есть соприкосновение, показываем только верхний узел на стыке
  let shouldDrawLeftNode = true
  if (isAdjacentToPrev) {
    const prevTop = prevRect.y()
    const currentTop = yTopLeft
    // если предыдущий стержень выше (его y меньше), не рисуем левый узел текущего
    if (prevTop < currentTop) {
      shouldDrawLeftNode = false
    } else {
      // текущий выше: удаляем ранее нарисованный правый узел предыдущего (номер узла = nodeLeftNumber)
      const oldSeamNodes = state.layer.find(`.node-${nodeLeftNumber}`)
      oldSeamNodes.forEach(s => s.destroy())
    }
  }

  if (shouldDrawLeftNode) {
    const nodeLeftText = new Konva.Text({
      x: xTopLeft - 8, // центр квадрата по X на пунктирной линии
      y: yTopLeft - oneCmPx - 20, // совпадает с y квадрата
      width: 16,
      height: 16,
      text: nodeLeftNumber.toString(),
      fontSize: 12,
      fontFamily: 'Arial',
      fill: '#ffffff',
      align: 'center',
      verticalAlign: 'middle',
      name: `node-${nodeLeftNumber}`,
    })
    const nodeLeftRect = new Konva.Rect({
      x: xTopLeft - 8,
      y: yTopLeft - oneCmPx - 20,
      width: 16,
      height: 16,
      fill: '#8b5cf6', // фиолетовый
      stroke: '#7c3aed',
      strokeWidth: 1,
      cornerRadius: 3,
      name: `node-${nodeLeftNumber}`,
    })
    state.layer.add(nodeLeftRect)
    state.layer.add(nodeLeftText)
  }

  // Правый узел (на расстоянии 1 клетки вверх от стержня)
  const nodeRightText = new Konva.Text({
    x: xTopLeft + width - 8, // центр квадрата по X на пунктирной линии
    y: yTopLeft - oneCmPx - 20, // совпадает с y квадрата
    width: 16,
    height: 16,
    text: nodeRightNumber.toString(),
    fontSize: 12,
    fontFamily: 'Arial',
    fill: '#ffffff',
    align: 'center',
    verticalAlign: 'middle',
    name: `node-${nodeRightNumber}`,
  })
  const nodeRightRect = new Konva.Rect({
    x: xTopLeft + width - 8,
    y: yTopLeft - oneCmPx - 20,
    width: 16,
    height: 16,
    fill: '#8b5cf6', // фиолетовый
    stroke: '#7c3aed',
    strokeWidth: 1,
    cornerRadius: 3,
    name: `node-${nodeRightNumber}`,
  })
  state.layer.add(nodeRightRect)
  state.layer.add(nodeRightText)

  // Пунктирные линии от узлов к стержню
  const dashPattern = [5, 5]
  
  // Линия от левого узла к левому верхнему краю стержня (рисуем, только если сам узел показан)
  let lineLeft = null
  if (shouldDrawLeftNode) {
    lineLeft = new Konva.Line({
      points: [xTopLeft, yTopLeft - oneCmPx - 12, xTopLeft, yTopLeft],
      stroke: '#8b5cf6',
      strokeWidth: 1,
      dash: dashPattern,
      name: `node-${nodeLeftNumber}`,
    })
  }
  
  // Линия от правого узла к правому верхнему краю стержня
  const lineRight = new Konva.Line({
    points: [xTopLeft + width, yTopLeft - oneCmPx - 12, xTopLeft + width, yTopLeft],
    stroke: '#8b5cf6',
    strokeWidth: 1,
    dash: dashPattern,
    name: `node-${nodeRightNumber}`,
  })
  
  if (lineLeft) state.layer.add(lineLeft)
  state.layer.add(lineRight)

  // Рисуем стрелки нагрузок Fx на узлах (только если Fx != 0)
  const drawFxArrow = (leftEdgeX, rightEdgeX, centerY, fxValue, nodeName) => {
    if (!fxValue) return
    const direction = fxValue > 0 ? 1 : -1
    const length = oneCmPx // длина стрелки = 1 клетка
    const startX = direction > 0 ? rightEdgeX : leftEdgeX
    const startY = centerY
    const endX = startX + direction * length
    const endY = centerY
    const arrow = new Konva.Arrow({
      points: [startX, startY, endX, endY],
      pointerLength: 10,
      pointerWidth: 10,
      fill: '#ec6aa0',
      stroke: '#ec6aa0',
      strokeWidth: 4,
      name: nodeName,
    })
    state.layer.add(arrow)
  }

  const drawFyArrow = (centerX, topEdgeY, bottomEdgeY, fyValue, nodeName) => {
    if (!fyValue) return
    const direction = fyValue > 0 ? -1 : 1 // вверх отрицательное смещение по y
    const length = oneCmPx
    const startY = fyValue > 0 ? topEdgeY : bottomEdgeY
    const endY = startY + direction * length
    const startX = centerX
    const endX = centerX
    const arrow = new Konva.Arrow({
      points: [startX, startY, endX, endY],
      pointerLength: 10,
      pointerWidth: 10,
      fill: '#ec6aa0',
      stroke: '#ec6aa0',
      strokeWidth: 4,
      name: nodeName,
    })
    state.layer.add(arrow)
  }

  // Отрисовка распределённой нагрузки qy на верхнем ребре стержня
  const drawDistributedQy = (x, yTop, widthPx, qyValue) => {
    if (!qyValue) return
    const arrowColor = '#8b5cf6'
    const arrowsCount = Math.max(4, Math.floor(widthPx / (measureOneCmInPx() * 1)))
    const step = widthPx / arrowsCount
    const arrowLen = measureOneCmInPx() * 0.9
    const direction = qyValue < 0 ? 1 : -1 // отрицательная — вниз, положительная — вверх
    const baseY = yTop + (direction < 0 ? 0 : 0) // от верхней кромки

    // базовая линия распределения
    const baseLine = new Konva.Line({
      points: [x, yTop - (direction < 0 ? arrowLen : 0), x + widthPx, yTop - (direction < 0 ? arrowLen : 0)],
      stroke: arrowColor,
      strokeWidth: 4,
    })
    state.layer.add(baseLine)

    for (let i = 0; i < arrowsCount; i++) {
      const ax = x + step * (i + 0.5)
      const startY = yTop - (direction < 0 ? arrowLen : 0)
      const endY = startY + direction * arrowLen
      const arrow = new Konva.Arrow({
        points: [ax, startY, ax, endY],
        pointerLength: 10,
        pointerWidth: 10,
        fill: arrowColor,
        stroke: arrowColor,
        strokeWidth: 4,
      })
      state.layer.add(arrow)
    }
  }

  // Вызов отрисовки qy
  drawDistributedQy(xTopLeft, yTopLeft, width, rodQy)

  // Отрисовка распределённой нагрузки qx над верхним ребром стержня
  const drawDistributedQx = (x, yTop, widthPx, qxValue) => {
    if (!qxValue) return
    const arrowColor = '#8b5cf6'
    const oneCm = measureOneCmInPx()
    const arrowsCount = Math.max(4, Math.floor(widthPx / (oneCm * 1.2)))
    const step = widthPx / arrowsCount
    const arrowLen = oneCm
    const direction = qxValue > 0 ? 1 : -1 // >0 вправо, <0 влево
    const y = yTop - oneCm * 0.8 // чуть выше верхнего ребра

    for (let i = 0; i < arrowsCount; i++) {
      const cx = x + step * (i + 0.5)
      const x1 = cx - (arrowLen / 2) * direction
      const x2 = cx + (arrowLen / 2) * direction
      const arrow = new Konva.Arrow({
        points: [x1, y, x2, y],
        pointerLength: 10,
        pointerWidth: 10,
        fill: arrowColor,
        stroke: arrowColor,
        strokeWidth: 4,
      })
      state.layer.add(arrow)
    }
  }

  // Вызов отрисовки qx
  drawDistributedQx(xTopLeft, yTopLeft, width, rodQx)

  // Центры квадратов узлов
  if (shouldDrawLeftNode) {
    const leftRectX = xTopLeft - 8
    const leftRightEdge = leftRectX + 16
    const leftCenterY = yTopLeft - oneCmPx - 20 + 8
    drawFxArrow(leftRectX, leftRightEdge, leftCenterY, leftFx, `node-${nodeLeftNumber}`)
    const leftCenterX = leftRectX + 8
    const leftTopEdge = yTopLeft - oneCmPx - 20
    const leftBottomEdge = leftTopEdge + 16
    drawFyArrow(leftCenterX, leftTopEdge, leftBottomEdge, leftFy, `node-${nodeLeftNumber}`)
  }
  {
    const rightRectX = xTopLeft + width - 8
    const rightRightEdge = rightRectX + 16
    const rightCenterY = yTopLeft - oneCmPx - 20 + 8
    drawFxArrow(rightRectX, rightRightEdge, rightCenterY, rightFx, `node-${nodeRightNumber}`)
    const rightCenterX = rightRectX + 8
    const rightTopEdge = yTopLeft - oneCmPx - 20
    const rightBottomEdge = rightTopEdge + 16
    drawFyArrow(rightCenterX, rightTopEdge, rightBottomEdge, rightFy, `node-${nodeRightNumber}`)
  }

  // Добавляем заделку если указана
  if (params.embedment === 'left') {
    drawEmbedment(xTopLeft, yTopLeft + height / 2, 'left', height)
  } else if (params.embedment === 'right') {
    drawEmbedment(xTopLeft + width, yTopLeft + height / 2, 'right', height)
  } else if (params.embedment === 'both') {
    // Отрисовываем обе заделки на одном стержне
    drawEmbedment(xTopLeft, yTopLeft + height / 2, 'left', height)
    drawEmbedment(xTopLeft + width, yTopLeft + height / 2, 'right', height)
  }

  state.layer.draw()
  resizeStage()
}

// Функция для отрисовки заделки
function drawEmbedment(x, y, side, rodHeight) {
  if (!state.layer || !Konva) return
  
  const embedmentLength = 15
  const embedmentHeight = rodHeight / 2 // заделка по высоте стержня
  
  if (side === 'left') {
    // Вертикальная линия заделки
    const verticalLine = new Konva.Line({
      points: [x, y - embedmentHeight, x, y + embedmentHeight],
      stroke: '#ffffff', // белый цвет
      strokeWidth: 3,
    })
    
    // Диагональные линии заделки (5 линий) - идут влево ОТ стержня вверх
    for (let i = 0; i < 5; i++) {
      const startY = y - embedmentHeight + (i * embedmentHeight * 2 / 4)
      const endY = startY + embedmentHeight / 4 // вниз вместо вверх
      const endX = x - embedmentLength // влево от стержня
      
      const diagonalLine = new Konva.Line({
        points: [x, startY, endX, endY],
        stroke: '#ffffff', // белый цвет
        strokeWidth: 2,
      })
      
      state.layer.add(diagonalLine)
    }
    
    state.layer.add(verticalLine)
  } else if (side === 'right') {
    // Вертикальная линия заделки
    const verticalLine = new Konva.Line({
      points: [x, y - embedmentHeight, x, y + embedmentHeight],
      stroke: '#ffffff', // белый цвет
      strokeWidth: 3,
    })
    
    // Диагональные линии заделки (5 линий) - идут вправо ОТ стержня вверх
    for (let i = 0; i < 5; i++) {
      const startY = y - embedmentHeight + (i * embedmentHeight * 2 / 4)
      const endY = startY - embedmentHeight / 4 // вверх вместо вниз
      const endX = x + embedmentLength // вправо от стержня
      
      const diagonalLine = new Konva.Line({
        points: [x, startY, endX, endY],
        stroke: '#ffffff', // белый цвет
        strokeWidth: 2,
      })
      
      state.layer.add(diagonalLine)
    }
    
    state.layer.add(verticalLine)
  }
}

function clearLayer() {
  if (!state.layer) return
  state.layer.destroyChildren()
  state.shapes = []
  state.layer.draw()
  resizeStage()
}

function panBy(deltaX, deltaY) {
  if (!state.stage) return
  const newX = state.stage.x() - deltaX
  const newY = state.stage.y() - deltaY
  state.stage.position({ x: newX, y: newY })
  state.stage.batchDraw()
}

function resetView() {
  if (!state.stage) return
  state.stage.position({ x: 0, y: 0 })
  state.stage.scale({ x: 1, y: 1 })
  state.stage.batchDraw()
}

function zoomAt(clientX, clientY, scaleBy) {
  if (!state.stage) return
  const stage = state.stage
  const oldScale = stage.scaleX() || 1
  let newScale = oldScale * scaleBy
  newScale = Math.max(LIMITS.minScale, Math.min(LIMITS.maxScale, newScale))

  const rect = stage.container().getBoundingClientRect()
  const pointer = { x: clientX - rect.left, y: clientY - rect.top }

  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  }

  stage.scale({ x: newScale, y: newScale })
  const newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  }
  stage.position(newPos)
  stage.batchDraw()
}

function zoomByCenter(scaleBy) {
  if (!state.stage) return
  const rect = state.stage.container().getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  zoomAt(cx, cy, scaleBy)
}

defineExpose({ addRect, clearLayer, panBy, resetView, zoomByCenter })

onMounted(() => {
  initKonva()
  window.addEventListener('resize', resizeStage)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeStage)
  if (state.stage) state.stage.destroy()
})
</script>

<style scoped>
.stage-container {
  width: 100%;
  height: 100%;
}
</style>


