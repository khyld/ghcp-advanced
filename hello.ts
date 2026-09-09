// returns the nth Fibonacci number 
function fib(n: number): number {
    if (n <= 1) {
        return n;
    }
    return fib(n - 1) + fib(n - 2);
}
/**
 * Determines whether a given number is prime.
 *
 * @param num - The number to check for primality.
 * @returns `true` if `num` is prime, `false` otherwise.
 * @throws {Error} If `num` is not an integer.
 */
function isPrime(num: number): boolean {
    if (!Number.isInteger(num)) {
        throw new Error("isPrime: num must be an integer");
    }
    if (num <= 1) return false;
    for (let i = 2; i * i <= num; i++) {
        if (num % i === 0) return false;
    }
    return true;
}

/**
 * Computes the nth prime number (1-indexed).
 *
 * @param n - The position of the prime to find (must be a positive integer, n >= 1).
 * @returns The nth prime number.
 * @throws {Error} If `n` is not a positive integer.
 */
async function nthPrime(n: number): Promise<number> {
    if (!Number.isInteger(n) || n < 1) {
        throw new Error("nthPrime: n must be a positive integer (n >= 1)");
    }
    let count = 0;
    let num = 1;
    while (count < n) {
        num++;
        if (isPrime(num)) {
            count++;
        }
    }
    return num;
}

// Unit test for nthPrime.
async function testNthPrime(): Promise<void> {
    const expectedPrimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];

    for (let i = 0; i < expectedPrimes.length; i++) {
        const result = await nthPrime(i + 1);
        if (result !== expectedPrimes[i]) {
            throw new Error(
                `nthPrime(${i + 1}) returned ${result}; expected ${expectedPrimes[i]}`,
            );
        }
    }

    try {
        await nthPrime(0);
        throw new Error("nthPrime(0) should reject");
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("positive integer")) {
            throw error;
        }
    }
}
