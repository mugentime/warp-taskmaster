// Debug message generation
let report = '<b>📊 TEST REPORT</b>\n';
report += 'Time: ' + new Date().toLocaleString() + '\n\n';
report += '<b>💰 PORTFOLIO</b>\n';
report += '🤖 Bots: 3\n';
report += '✅ Working\n\n';
report += '<b>🖥️ SYSTEM</b>\n';
report += '📱 Bot: Active\n\n';
report += '<i>Test message</i>';

console.log('Generated message:');
console.log(JSON.stringify(report));
console.log('\nMessage length:', report.length);
console.log('\nActual message:');
console.log(report);
