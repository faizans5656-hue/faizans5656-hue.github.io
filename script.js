// Loan Calculator JavaScript
// This file contains the core calculation logic for Phase 1

// Global variables for currency and locale
let currentLocale = 'en-US';
let currentCurrency = 'USD';

// Currency mapping: locale code -> { symbol, currency code }
const currencyMap = {
    'en-US': { symbol: '$', currency: 'USD' },
    'de-DE': { symbol: '€', currency: 'EUR' },
    'en-GB': { symbol: '£', currency: 'GBP' },
    'en-IN': { symbol: '₹', currency: 'INR' },
    'ja-JP': { symbol: '¥', currency: 'JPY' }
};

/**
 * Updates the currency symbol display based on the selected currency
 */
function updateCurrencyDisplay() {
    const currencySelector = document.getElementById('currency-selector');
    if (!currencySelector) return;
    
    const selectedLocale = currencySelector.value;
    const currencyInfo = currencyMap[selectedLocale];
    
    if (currencyInfo) {
        currentLocale = selectedLocale;
        currentCurrency = currencyInfo.currency;
        
        // Update all currency symbol spans in the loan calculator form
        const currencySymbols = document.querySelectorAll('#loan-calculator-tab .currency-symbol');
        currencySymbols.forEach(symbol => {
            symbol.textContent = currencyInfo.symbol;
        });
    }
}

/**
 * Calculates the amortization schedule and returns key metrics
 * @param {number} principal - The loan principal amount (P)
 * @param {number} annualRate - The annual interest rate as a percentage (r)
 * @param {number} termYears - The loan term in years (n)
 * @param {number} [extraMonthlyPayment=0] - Optional extra monthly payment amount
 * @param {Date} [startDate] - Optional start date for the loan (defaults to current date)
 * @returns {Object} An object containing:
 *   - monthsToPayoff: Total number of months to pay off the loan
 *   - totalInterestPaid: Total interest paid over the life of the loan
 *   - totalInterestSaved: Total interest saved compared to no extra payments
 *   - monthlyPayment: Standard monthly payment amount
 *   - schedule: Array of payment objects with payment number, date, interest paid, principal paid, and remaining balance
 */
function calculateAmortization(principal, annualRate, termYears, extraMonthlyPayment = 0, startDate = new Date()) {
    // Validate inputs
    if (principal <= 0 || annualRate < 0 || termYears <= 0 || extraMonthlyPayment < 0) {
        throw new Error('Invalid input: All values must be positive (or zero for extra payment)');
    }

    // Convert annual rate to decimal and calculate monthly rate
    const monthlyRate = (annualRate / 100) / 12;
    const totalMonths = termYears * 12;

    // Calculate standard monthly payment using the formula:
    // M = P * (r/12 * (1 + r/12)^(12n)) / ((1 + r/12)^(12n) - 1)
    let monthlyPayment;
    
    if (monthlyRate === 0) {
        // Handle zero interest case (simple division)
        monthlyPayment = principal / totalMonths;
    } else {
        const compoundFactor = Math.pow(1 + monthlyRate, totalMonths);
        monthlyPayment = principal * (monthlyRate * compoundFactor) / (compoundFactor - 1);
    }

    // Round monthly payment to 2 decimal places
    monthlyPayment = Math.round(monthlyPayment * 100) / 100;

    // Calculate total interest without extra payments (for comparison)
    const totalInterestWithoutExtra = (monthlyPayment * totalMonths) - principal;

    // Simulate the loan payment-by-payment with extra payments
    let balance = principal;
    let totalInterestPaid = 0;
    let monthsToPayoff = 0;
    const maxMonths = totalMonths * 2; // Safety limit to prevent infinite loops
    const schedule = []; // Array to store payment-by-payment data

    // Create a date object for tracking payment dates
    const baseDate = new Date(startDate);
    baseDate.setDate(1); // Set to first of the month for consistency

    while (balance > 0.01 && monthsToPayoff < maxMonths) { // 0.01 threshold for floating point precision
        monthsToPayoff++;
        
        // Calculate interest for this month
        const monthlyInterest = balance * monthlyRate;
        totalInterestPaid += monthlyInterest;
        
        // Calculate principal payment (standard payment minus interest)
        let principalPayment = monthlyPayment - monthlyInterest;
        
        // Add extra payment to principal payment
        const totalPrincipalPayment = principalPayment + extraMonthlyPayment;
        
        // Store payment data before updating balance
        const paymentNumber = monthsToPayoff;
        const interestPaid = Math.round(monthlyInterest * 100) / 100;
        const principalPaid = Math.round(totalPrincipalPayment * 100) / 100;
        
        // Update balance
        balance = balance - totalPrincipalPayment;
        
        // If balance becomes negative, adjust (overpayment)
        let remainingBalance = balance;
        if (balance < 0) {
            // Adjust total interest paid if we overpaid
            const overpayment = Math.abs(balance);
            totalInterestPaid = Math.max(0, totalInterestPaid - overpayment);
            remainingBalance = 0;
        }
        
        // Round remaining balance
        remainingBalance = Math.round(remainingBalance * 100) / 100;
        
        // Create payment date for this payment (first payment is 1 month after start date)
        // Use EDATE logic: add the payment number of months to the base date
        const currentPaymentDate = new Date(baseDate);
        currentPaymentDate.setMonth(baseDate.getMonth() + paymentNumber);
        
        // Add payment object to schedule
        schedule.push({
            paymentNumber: paymentNumber,
            date: new Date(currentPaymentDate),
            interestPaid: interestPaid,
            principalPaid: principalPaid,
            remainingBalance: remainingBalance
        });
        
        // Update balance for next iteration
        balance = remainingBalance;
    }

    // Round values to 2 decimal places for currency
    totalInterestPaid = Math.round(totalInterestPaid * 100) / 100;
    
    // Calculate interest saved
    const totalInterestSaved = Math.max(0, totalInterestWithoutExtra - totalInterestPaid);
    const roundedInterestSaved = Math.round(totalInterestSaved * 100) / 100;

    return {
        monthsToPayoff: monthsToPayoff,
        totalInterestPaid: totalInterestPaid,
        totalInterestSaved: roundedInterestSaved,
        monthlyPayment: monthlyPayment, // Bonus: also return the standard monthly payment
        schedule: schedule // Return the detailed payment schedule
    };
}

/**
 * Formats a number as currency using the selected locale
 * @param {number} amount - The amount to format
 * @param {string} [locale] - Optional locale override (defaults to currentLocale)
 * @param {string} [currency] - Optional currency override (defaults to currentCurrency)
 * @returns {string} Formatted currency string (e.g., "$1,234.56")
 */
function formatCurrency(amount, locale = currentLocale, currency = currentCurrency) {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Converts total months to a human-readable format
 * @param {number} totalMonths - Total number of months
 * @returns {string} Formatted string (e.g., "5 years and 3 months" or "11 months")
 */
function formatPayoffTime(totalMonths) {
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    
    if (years === 0) {
        return months === 1 ? '1 month' : `${months} months`;
    } else if (months === 0) {
        return years === 1 ? '1 year' : `${years} years`;
    } else {
        const yearsText = years === 1 ? '1 year' : `${years} years`;
        const monthsText = months === 1 ? '1 month' : `${months} months`;
        return `${yearsText} and ${monthsText}`;
    }
}

/**
 * Formats a date as a readable string (MM/DD/YYYY)
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

/**
 * Calculates the monthly payment for a loan
 * @param {number} principal - The loan principal amount
 * @param {number} annualRate - The annual interest rate as a percentage
 * @param {number} termYears - The loan term in years
 * @returns {number} The monthly payment amount
 */
function calculateMonthlyPayment(principal, annualRate, termYears) {
    if (principal <= 0 || termYears <= 0) {
        return 0;
    }
    
    const monthlyRate = (annualRate / 100) / 12;
    const totalMonths = termYears * 12;
    
    if (monthlyRate === 0) {
        // Handle zero interest case (simple division)
        return principal / totalMonths;
    } else {
        const compoundFactor = Math.pow(1 + monthlyRate, totalMonths);
        const monthlyPayment = principal * (monthlyRate * compoundFactor) / (compoundFactor - 1);
        return Math.round(monthlyPayment * 100) / 100;
    }
}

/**
 * Calculates the refinance break-even point
 * @param {number} originalMonthlyPayment - The original loan's monthly payment
 * @param {number} newMonthlyPayment - The new loan's monthly payment
 * @param {number} closingCosts - The total refinance closing costs
 * @returns {Object} An object containing:
 *   - breakEvenMonths: Number of months to break even (null if no savings)
 *   - monthlySavings: Monthly savings amount
 *   - totalSavingsOverRemainingTerm: Total savings over the remaining loan term (if applicable)
 *   - isValid: Whether the refinance makes financial sense
 */
function calculateRefinanceBreakEven(originalMonthlyPayment, newMonthlyPayment, closingCosts) {
    // Validate inputs
    if (originalMonthlyPayment <= 0 || newMonthlyPayment < 0 || closingCosts < 0) {
        throw new Error('Invalid input: Monthly payments must be positive and closing costs must be non-negative');
    }
    
    // Calculate monthly savings
    const monthlySavings = originalMonthlyPayment - newMonthlyPayment;
    
    // If there are no savings or negative savings, refinancing doesn't make sense
    if (monthlySavings <= 0) {
        return {
            breakEvenMonths: null,
            monthlySavings: monthlySavings,
            totalSavingsOverRemainingTerm: null,
            isValid: false
        };
    }
    
    // Calculate break-even point: closing costs divided by monthly savings
    const breakEvenMonths = closingCosts / monthlySavings;
    
    // Round to 2 decimal places
    const roundedBreakEvenMonths = Math.round(breakEvenMonths * 100) / 100;
    
    return {
        breakEvenMonths: roundedBreakEvenMonths,
        monthlySavings: Math.round(monthlySavings * 100) / 100,
        totalSavingsOverRemainingTerm: null, // Can be calculated later if we know the remaining term
        isValid: true
    };
}

/**
 * Populates the amortization table with payment schedule data
 * @param {Array} schedule - Array of payment objects from calculateAmortization
 */
function populateAmortizationTable(schedule) {
    const tableBody = document.getElementById('amortizationTableBody');
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Determine where to insert the native ad (after 10 rows, or in the middle if fewer than 20 rows)
    const adInsertPosition = schedule.length > 20 ? 10 : Math.floor(schedule.length / 2);
    let nativeAdInserted = false;
    
    // Create a row for each payment
    schedule.forEach((payment, index) => {
        // Insert native ad at the determined position
        if (index === adInsertPosition && !nativeAdInserted && schedule.length > 5) {
            const adRow = document.createElement('tr');
            const adCell = document.createElement('td');
            adCell.colSpan = 5;
            adCell.className = 'ads-native-cell';
            adCell.innerHTML = `
                <div class="ads-native-container">
                    <ins class="adsbygoogle"
                         style="display:block"
                         data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                         data-ad-slot="XXXXXXXXXX"
                         data-ad-format="fluid"
                         data-layout="in-article"
                         data-full-width-responsive="true"></ins>
                </div>
            `;
            adRow.appendChild(adCell);
            tableBody.appendChild(adRow);
            
            // Push the ad to AdSense
            try {
                (adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                console.log('AdSense not loaded yet');
            }
            
            nativeAdInserted = true;
        }
        
        const row = document.createElement('tr');
        
        // Payment Number
        const paymentNumberCell = document.createElement('td');
        paymentNumberCell.textContent = payment.paymentNumber;
        row.appendChild(paymentNumberCell);
        
        // Date
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(payment.date);
        row.appendChild(dateCell);
        
        // Interest Paid
        const interestCell = document.createElement('td');
        interestCell.textContent = formatCurrency(payment.interestPaid);
        row.appendChild(interestCell);
        
        // Principal Paid
        const principalCell = document.createElement('td');
        principalCell.textContent = formatCurrency(payment.principalPaid);
        row.appendChild(principalCell);
        
        // Remaining Balance
        const balanceCell = document.createElement('td');
        balanceCell.textContent = formatCurrency(payment.remainingBalance);
        row.appendChild(balanceCell);
        
        tableBody.appendChild(row);
    });
}

// Global variable to store the chart instance
let loanChartInstance = null;

// Global variable to store the original loan's monthly payment for refinance calculations
let originalLoanMonthlyPayment = null;

/**
 * Creates or updates the loan visualization chart
 * @param {Array} schedule - Array of payment objects from calculateAmortization
 */
function createLoanChart(schedule) {
    const canvas = document.getElementById('loanChart');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (loanChartInstance) {
        loanChartInstance.destroy();
    }
    
    // Prepare data for the chart
    // For better visualization, we'll show all payments but may aggregate for very long loans
    const labels = [];
    const remainingBalanceData = [];
    const principalPaidData = [];
    const interestPaidData = [];
    
    // Determine if we should aggregate by year (for loans longer than 5 years)
    const shouldAggregate = schedule.length > 60;
    let aggregationPeriod = 12; // Aggregate by year (12 months)
    
    if (shouldAggregate) {
        // Aggregate data by year
        const aggregatedData = {};
        
        schedule.forEach(payment => {
            const year = Math.floor((payment.paymentNumber - 1) / aggregationPeriod);
            const yearLabel = `Year ${year + 1}`;
            
            if (!aggregatedData[year]) {
                aggregatedData[year] = {
                    label: yearLabel,
                    principal: 0,
                    interest: 0,
                    balance: payment.remainingBalance
                };
            }
            
            aggregatedData[year].principal += payment.principalPaid;
            aggregatedData[year].interest += payment.interestPaid;
            aggregatedData[year].balance = payment.remainingBalance; // Keep the last balance of the year
        });
        
        // Convert aggregated data to arrays
        Object.values(aggregatedData).forEach(data => {
            labels.push(data.label);
            remainingBalanceData.push(data.balance);
            principalPaidData.push(data.principal);
            interestPaidData.push(data.interest);
        });
    } else {
        // Show monthly data
        schedule.forEach(payment => {
            labels.push(`Payment ${payment.paymentNumber}`);
            remainingBalanceData.push(payment.remainingBalance);
            principalPaidData.push(payment.principalPaid);
            interestPaidData.push(payment.interestPaid);
        });
    }
    
    // Create the chart with dual y-axes
    loanChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Principal Paid',
                    data: principalPaidData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1,
                    yAxisID: 'y1',
                    order: 1
                },
                {
                    label: 'Interest Paid',
                    data: interestPaidData,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1,
                    yAxisID: 'y1',
                    order: 1
                },
                {
                    label: 'Remaining Balance',
                    data: remainingBalanceData,
                    type: 'line',
                    borderColor: 'rgb(37, 99, 235)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y',
                    order: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: shouldAggregate ? 'Year' : 'Payment Number'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: `Remaining Balance (${currencyMap[currentLocale].symbol})`
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString(currentLocale, {
                                style: 'currency',
                                currency: currentCurrency,
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            });
                        }
                    },
                    grid: {
                        color: 'rgba(37, 99, 235, 0.1)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: `Amount Paid (${currencyMap[currentLocale].symbol})`
                    },
                    stacked: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString(currentLocale, {
                                style: 'currency',
                                currency: currentCurrency,
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            });
                        }
                    },
                    grid: {
                        drawOnChartArea: false,
                    }
                }
            }
        }
    });
}

/**
 * Displays the calculation results in the results container
 * @param {Object} results - The results object from calculateAmortization
 */
function displayResults(results) {
    const resultsContainer = document.getElementById('results');
    const standardPaymentEl = document.getElementById('standardPayment');
    const newPayoffTimeEl = document.getElementById('newPayoffTime');
    const totalInterestSavedEl = document.getElementById('totalInterestSaved');
    
    // Update the result values
    standardPaymentEl.textContent = formatCurrency(results.monthlyPayment);
    newPayoffTimeEl.textContent = formatPayoffTime(results.monthsToPayoff);
    totalInterestSavedEl.textContent = formatCurrency(results.totalInterestSaved);
    
    // Populate the amortization table
    if (results.schedule && results.schedule.length > 0) {
        populateAmortizationTable(results.schedule);
        // Create the loan chart
        createLoanChart(results.schedule);
    }
    
    // Show the results container
    resultsContainer.style.display = 'block';
    
    // Smooth scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Displays the refinance analysis results
 * @param {Object} breakEvenResult - The break-even calculation result
 * @param {number} newMonthlyPayment - The new loan's monthly payment
 */
function displayRefinanceResults(breakEvenResult, newMonthlyPayment) {
    const refinanceResultsContainer = document.getElementById('refinanceResults');
    const breakEvenTextEl = document.getElementById('breakEvenText');
    const monthlySavingsEl = document.getElementById('monthlySavings');
    const newPaymentEl = document.getElementById('newPayment');
    
    if (!refinanceResultsContainer || !breakEvenTextEl) {
        console.error('Refinance results container elements not found');
        return;
    }
    
    // Display new monthly payment
    if (newPaymentEl) {
        newPaymentEl.textContent = formatCurrency(newMonthlyPayment);
    }
    
    // Display monthly savings
    if (monthlySavingsEl) {
        monthlySavingsEl.textContent = formatCurrency(breakEvenResult.monthlySavings);
    }
    
    // Display break-even point or warning message
    if (!breakEvenResult.isValid || breakEvenResult.monthlySavings <= 0) {
        breakEvenTextEl.textContent = 'Refinancing does not provide monthly savings. The new monthly payment is equal to or higher than your current payment.';
        breakEvenTextEl.style.color = 'var(--text-secondary)';
        breakEvenTextEl.classList.remove('highlight-value');
        breakEvenTextEl.style.fontSize = '1rem';
    } else {
        const breakEvenMonths = breakEvenResult.breakEvenMonths;
        const years = Math.floor(breakEvenMonths / 12);
        const months = Math.round(breakEvenMonths % 12);
        
        let breakEvenText = 'You will break even in ';
        if (years > 0 && months > 0) {
            breakEvenText += `${years} ${years === 1 ? 'year' : 'years'} and ${months} ${months === 1 ? 'month' : 'months'}`;
        } else if (years > 0) {
            breakEvenText += `${years} ${years === 1 ? 'year' : 'years'}`;
        } else if (months > 0) {
            breakEvenText += `${months} ${months === 1 ? 'month' : 'months'}`;
        } else {
            // Less than 1 month
            const days = Math.round(breakEvenMonths * 30);
            breakEvenText += `${days} ${days === 1 ? 'day' : 'days'}`;
        }
        breakEvenText += '.';
        
        breakEvenTextEl.textContent = breakEvenText;
        breakEvenTextEl.style.color = 'var(--success-color)';
        breakEvenTextEl.classList.add('highlight-value');
        breakEvenTextEl.style.fontSize = '1.5rem';
    }
    
    // Show the results container
    refinanceResultsContainer.style.display = 'block';
    
    // Smooth scroll to results
    refinanceResultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// DOMContentLoaded event listener for form handling
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            const targetContent = document.getElementById(targetTab + '-tab');
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'block';
            }
        });
    });
    
    // Currency selector event listener
    const currencySelector = document.getElementById('currency-selector');
    if (currencySelector) {
        currencySelector.addEventListener('change', updateCurrencyDisplay);
    }
    
    // Initialize currency display on page load
    updateCurrencyDisplay();
    
    // Loan calculator form handling
    const form = document.getElementById('loanCalculatorForm');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const principal = parseFloat(document.getElementById('loanPrincipal').value);
        const annualRate = parseFloat(document.getElementById('annualInterestRate').value);
        const termYears = parseFloat(document.getElementById('loanTerm').value);
        const extraPayment = parseFloat(document.getElementById('extraMonthlyPayment').value) || 0;
        
        // Get loan start date
        const loanStartDateInput = document.getElementById('loan-start-date');
        let startDate = new Date();
        if (loanStartDateInput && loanStartDateInput.value) {
            startDate = new Date(loanStartDateInput.value);
        }
        
        try {
            // Calculate amortization with the selected start date
            const results = calculateAmortization(principal, annualRate, termYears, extraPayment, startDate);
            
            // Store the original loan's monthly payment for refinance calculations
            originalLoanMonthlyPayment = results.monthlyPayment;
            
            // Display results in the UI
            displayResults(results);
        } catch (error) {
            console.error('Calculation error:', error.message);
            alert('Error: ' + error.message);
        }
    });
    
    // Refinance form handling
    const refinanceForm = document.getElementById('refinanceForm');
    if (refinanceForm) {
        refinanceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Check if original loan data is available
            if (!originalLoanMonthlyPayment || originalLoanMonthlyPayment <= 0) {
                alert('Please calculate your original loan first using the Loan Calculator tab.');
                return;
            }
            
            // Get refinance form values
            const refinancePrincipal = parseFloat(document.getElementById('refinancePrincipal').value) || 0;
            const refinanceInterestRate = parseFloat(document.getElementById('refinanceInterestRate').value) || 0;
            const refinanceTerm = parseFloat(document.getElementById('refinanceTerm').value) || 0;
            const refinanceClosingCosts = parseFloat(document.getElementById('refinanceClosingCosts').value) || 0;
            
            // Validate inputs
            if (refinancePrincipal <= 0 || refinanceInterestRate < 0 || refinanceTerm <= 0) {
                alert('Please enter valid values for the new loan principal, interest rate, and term.');
                return;
            }
            
            try {
                // Calculate the new loan's monthly payment
                const newMonthlyPayment = calculateMonthlyPayment(refinancePrincipal, refinanceInterestRate, refinanceTerm);
                
                // Calculate the break-even point
                const breakEvenResult = calculateRefinanceBreakEven(
                    originalLoanMonthlyPayment,
                    newMonthlyPayment,
                    refinanceClosingCosts
                );
                
                // Display the refinance analysis results
                displayRefinanceResults(breakEvenResult, newMonthlyPayment);
            } catch (error) {
                console.error('Refinance calculation error:', error.message);
                alert('Error: ' + error.message);
            }
        });
    }
});

