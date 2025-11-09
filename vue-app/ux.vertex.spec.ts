/**
 * Тесты для расчета экстремумов Ux
 * Запуск: npm test или node ux.vertex.spec.ts
 */

// Функции расчета (копия из ResultsModal.vue)
function uxAtLocal(x: number, p: { L: number; q: number; E: number; A: number; U0: number; UL: number }): number {
    const { L, q, E, A: Area, U0, UL } = p
    const eps = 1e-12
    if (Math.abs(L) < eps || Math.abs(E) < eps || Math.abs(Area) < eps) {
        return U0 + ((UL - U0) * x / Math.max(L, eps))
    }

    const EA = E * Area
    const A2 = -q / (2 * EA)  // Квадратичный коэффициент (БЕЗ L!)
    const B = (UL - U0) / L + (q * L) / (2 * EA)  // Линейный коэффициент

    return U0 + B * x + A2 * x * x
}

function vertexXLocal(p: { L: number; q: number; E: number; A: number; U0: number; UL: number }): number | null {
    const { L, q, E, A: Area, U0, UL } = p
    const EA = E * Area

    const A2 = -q / (2 * EA)
    if (Math.abs(A2) < 1e-18) return null

    const B = (UL - U0) / L + (q * L) / (2 * EA)
    let xv = -B / (2 * A2)

    if (!Number.isFinite(xv)) return null

    const tol = 1e-9 * L
    if (!(xv > tol && xv < L - tol)) return null

    return xv
}

function vertexULocal(p: { L: number; q: number; E: number; A: number; U0: number; UL: number }): { x: number; u: number; kind: 'min' | 'max' } | null {
    const { L, q, E, A: Area } = p
    const EA = E * Area
    const A2 = -q / (2 * EA)

    const xv = vertexXLocal(p)
    if (xv == null) return null

    const u = uxAtLocal(xv, p)
    const kind = A2 < 0 ? 'max' : 'min'

    return { x: xv, u: u, kind: kind }
}

// Тесты
function test1() {
    console.log('Тест 1: Симметричный случай (U0=0, UL=0, q>0)')
    const p = { L: 2, q: 1000, E: 2e11, A: 0.01, U0: 0, UL: 0 }
    const vertex = vertexULocal(p)

    if (!vertex) {
        console.error('❌ Тест 1 провален: вершина не найдена')
        return false
    }

    const expectedX = p.L / 2
    const expectedU = (p.q * p.L * p.L) / (8 * p.E * p.A)

    const xOk = Math.abs(vertex.x - expectedX) < 1e-3
    const uOk = Math.abs(vertex.u - expectedU) < 1e-3
    const kindOk = vertex.kind === 'max'  // q>0 → A<0 → max

    console.log(`  xv = ${vertex.x.toFixed(6)} (ожидается ${expectedX.toFixed(6)})`)
    console.log(`  u(xv) = ${vertex.u.toFixed(6)} (ожидается ${expectedU.toFixed(6)})`)
    console.log(`  kind = ${vertex.kind} (ожидается max)`)

    if (xOk && uOk && kindOk) {
        console.log('✅ Тест 1 пройден')
        return true
    } else {
        console.error('❌ Тест 1 провален')
        return false
    }
}

function test2() {
    console.log('\nТест 2: Минимум (U0=0, UL=0, q<0)')
    const p = { L: 3, q: -1000, E: 2e11, A: 0.01, U0: 0, UL: 0 }
    const vertex = vertexULocal(p)

    if (!vertex) {
        console.error('❌ Тест 2 провален: вершина не найдена')
        return false
    }

    const expectedX = p.L / 2
    const expectedU = (p.q * p.L * p.L) / (8 * p.E * p.A)

    const xOk = Math.abs(vertex.x - expectedX) < 1e-3
    const uOk = Math.abs(vertex.u - expectedU) < 1e-3
    const kindOk = vertex.kind === 'min'  // q<0 → A>0 → min

    console.log(`  xv = ${vertex.x.toFixed(6)} (ожидается ${expectedX.toFixed(6)})`)
    console.log(`  u(xv) = ${vertex.u.toFixed(6)} (ожидается ${expectedU.toFixed(6)})`)
    console.log(`  kind = ${vertex.kind} (ожидается min)`)

    if (xOk && uOk && kindOk) {
        console.log('✅ Тест 2 пройден')
        return true
    } else {
        console.error('❌ Тест 2 провален')
        return false
    }
}

function test3() {
    console.log('\nТест 3: Реальный случай из скрина (3-й стержень)')
    // Подставьте реальные значения из вашего случая
    // Примерные значения (замените на реальные):
    const p = {
        L: 3.0,      // длина стержня в метрах
        q: -5000,    // распределенная нагрузка (отрицательная для минимума)
        E: 2e11,     // модуль упругости
        A: 0.01,     // площадь сечения
        U0: -1.0,    // смещение в начале
        UL: -0.5     // смещение в конце
    }

    const vertex = vertexULocal(p)

    if (!vertex) {
        console.error('❌ Тест 3 провален: вершина не найдена')
        console.log('  Параметры:', p)
        return false
    }

    const expectedU = -6.728  // ожидаемое значение из ручного расчета
    const uOk = Math.abs(vertex.u - expectedU) < 1e-3
    const xOk = vertex.x > p.L * 0.3 && vertex.x < p.L * 0.7  // около середины

    console.log(`  xv = ${vertex.x.toFixed(6)} м (ожидается около ${(p.L / 2).toFixed(2)} м)`)
    console.log(`  u(xv) = ${vertex.u.toFixed(6)} м (ожидается ≈ ${expectedU.toFixed(3)} м)`)
    console.log(`  kind = ${vertex.kind}`)

    if (uOk && xOk) {
        console.log('✅ Тест 3 пройден')
        return true
    } else {
        console.error('❌ Тест 3 провален')
        console.log(`  u(xv) отличается на ${Math.abs(vertex.u - expectedU).toFixed(6)}`)
        return false
    }
}

// Запуск тестов
if (typeof require !== 'undefined' && require.main === module) {
    console.log('Запуск тестов для расчета экстремумов Ux\n')
    const results = [test1(), test2(), test3()]
    const passed = results.filter(r => r).length
    console.log(`\nИтого: ${passed}/${results.length} тестов пройдено`)
    process.exit(passed === results.length ? 0 : 1)
}

export { test1, test2, test3, uxAtLocal, vertexXLocal, vertexULocal }

