export type GaussLog = string[];

export interface GaussResult {
    x: number[];          // решение
    U: number[][];        // верхнетреугольная матрица после прямого хода
    b: number[];          // модифицированный столбец правых частей
    swaps: Array<[number, number]>; // какие строки меняли местами
    steps: GaussLog;      // текстовый лог шагов
}

const EPS = 1e-12;

function cloneMatrix(A: number[][]): number[][] {
    return A.map(row => row.slice());
}

function swapRows(A: number[][], b: number[], i: number, j: number, steps: GaussLog) {
    if (i === j) return;
    [A[i], A[j]] = [A[j], A[i]];
    [b[i], b[j]] = [b[j], b[i]];
    steps.push(`Поменяли местами строки ${i + 1} и ${j + 1}.`);
}

function forwardElimination(Ain: number[][], bin: number[], steps: GaussLog) {
    const A = cloneMatrix(Ain);
    const b = bin.slice();
    const n = A.length;
    const swaps: Array<[number, number]> = [];

    for (let k = 0; k < n; k++) {
        // Выбор ведущего элемента в столбце k (частичный выбор главного элемента)
        let pivot = k;
        for (let i = k + 1; i < n; i++) {
            if (Math.abs(A[i][k]) > Math.abs(A[pivot][k])) pivot = i;
        }
        if (Math.abs(A[pivot][k]) < EPS) {
            throw new Error(`Матрица вырождена на шаге ${k + 1}: ведущий элемент ~ 0.`);
        }

        // Перестановка строк
        if (pivot !== k) {
            swapRows(A, b, k, pivot, steps);
            swaps.push([k, pivot]);
        } else {
            steps.push(`В столбце ${k + 1} ведущий элемент уже в строке ${k + 1} (a${k + 1}${k + 1} = ${A[k][k].toFixed(6)}).`);
        }

        // Зануление элементов ниже
        for (let i = k + 1; i < n; i++) {
            const factor = A[i][k] / A[k][k];
            if (Math.abs(factor) < EPS) continue;

            for (let j = k; j < n; j++) {
                A[i][j] -= factor * A[k][j];
            }
            b[i] -= factor * b[k];

            steps.push(
                `Занулили элемент a${i + 1}${k + 1}: R${i + 1} := R${i + 1} − (${factor.toFixed(6)})·R${k + 1}.`
            );
        }
    }

    return { U: A, b, swaps };
}

function backSubstitution(U: number[][], b: number[], steps: GaussLog): number[] {
    const n = U.length;
    const x = new Array(n).fill(0);

    for (let i = n - 1; i >= 0; i--) {
        let s = 0;
        for (let j = i + 1; j < n; j++) s += U[i][j] * x[j];

        if (Math.abs(U[i][i]) < EPS) {
            throw new Error(`Нулевой диагональный элемент на обратном ходе в строке ${i + 1}.`);
        }

        x[i] = (b[i] - s) / U[i][i];
        steps.push(`Нашли x_${i + 1} = (${b[i].toFixed(6)} − ${s.toFixed(6)}) / ${U[i][i].toFixed(6)} = ${x[i].toFixed(6)}.`);
    }

    return x;
}

/**
 * Решает систему A x = b методом Гаусса с частичным выбором главного элемента.
 * Возвращает решение, верхнетреугольную матрицу после прямого хода, модифицированный b и подробный лог.
 */
export function gaussianElimination(A: number[][], b: number[]): GaussResult {
    if (A.length === 0 || A.length !== A[0].length) {
        throw new Error('Ожидается квадратная матрица A.');
    }
    if (b.length !== A.length) {
        throw new Error('Размер b не совпадает с размером A.');
    }

    const steps: GaussLog = [];
    steps.push('Старт: прямой ход Гаусса.');

    const { U, b: b2, swaps } = forwardElimination(A, b, steps);

    steps.push('Переходим к обратному ходу (обратная подстановка).');

    const x = backSubstitution(U, b2, steps);

    steps.push('Готово: решение получено.');

    return { x, U, b: b2, swaps, steps };
}

/**
 * Удобный хелпер: принимает расширенную матрицу [A|b] размером n × (n+1).
 */
export function solveAugmented(Ab: number[][]): GaussResult {
    const n = Ab.length;
    const A: number[][] = new Array(n);
    const b = new Array(n);
    for (let i = 0; i < n; i++) {
        A[i] = Ab[i].slice(0, n);
        b[i] = Ab[i][n];
    }
    return gaussianElimination(A, b);
}



