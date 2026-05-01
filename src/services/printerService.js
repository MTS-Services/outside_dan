/**
 * Thermal printer (ESC/POS) service.
 * Uses node-thermal-printer over network (TCP) or USB.
 */
const config = require('../config');

let ThermalPrinter, PrinterTypes;
try {
  ({ printer: ThermalPrinter, types: PrinterTypes } = require('node-thermal-printer'));
} catch (e) {
  // module not installed — printing will be skipped
}

function getPrinter() {
  if (!ThermalPrinter) return null;
  return new ThermalPrinter({
    type: config.printer.type === 'star' ? PrinterTypes.STAR : PrinterTypes.EPSON,
    interface: config.printer.interface,
    options: { timeout: 5000 },
    width: 42,
    characterSet: 'PC852_LATIN2',
  });
}

function formatMoney(n) {
  return `EUR ${Number(n).toFixed(2)}`;
}

/**
 * Print an order ticket. Silently no-ops when printing is disabled
 * or the printer module / device is not available.
 */
async function printOrderTicket(order) {
  if (!config.printer.enabled) {
    return { printed: false, reason: 'disabled' };
  }
  const printer = getPrinter();
  if (!printer) {
    return { printed: false, reason: 'module-missing' };
  }

  try {
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) return { printed: false, reason: 'not-connected' };

    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(config.restaurant.name);
    printer.bold(false);
    printer.setTextNormal();
    if (config.restaurant.address) printer.println(config.restaurant.address);
    if (config.restaurant.phone) printer.println(config.restaurant.phone);
    printer.drawLine();

    printer.alignLeft();
    printer.bold(true);
    printer.println(`ORDER  ${order.orderNumber}`);
    printer.bold(false);
    printer.println(`Time:  ${new Date(order.createdAt).toLocaleString()}`);
    printer.println(`Type:  DELIVERY`);
    printer.drawLine();

    printer.bold(true);
    printer.println('CUSTOMER');
    printer.bold(false);
    printer.println(order.customerName);
    printer.println(order.customerPhone);
    printer.println(`${order.street}`);
    printer.println(`${order.postalCode} ${order.city}`);
    if (order.notes) {
      printer.println(`Notes: ${order.notes}`);
    }
    printer.drawLine();

    printer.bold(true);
    printer.tableCustom([
      { text: 'ITEM', align: 'LEFT', width: 0.6 },
      { text: 'QTY', align: 'CENTER', width: 0.15 },
      { text: 'PRICE', align: 'RIGHT', width: 0.25 },
    ]);
    printer.bold(false);
    for (const it of order.items) {
      printer.tableCustom([
        { text: it.name, align: 'LEFT', width: 0.6 },
        { text: String(it.quantity), align: 'CENTER', width: 0.15 },
        { text: formatMoney(Number(it.price) * it.quantity), align: 'RIGHT', width: 0.25 },
      ]);
      if (it.notes) printer.println(`  > ${it.notes}`);
    }
    printer.drawLine();

    printer.alignRight();
    printer.println(`Subtotal: ${formatMoney(order.subtotal)}`);
    printer.println(`Delivery: ${formatMoney(order.deliveryFee)}`);
    if (Number(order.tax) > 0) printer.println(`Tax:      ${formatMoney(order.tax)}`);
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(`TOTAL:   ${formatMoney(order.total)}`);
    printer.setTextNormal();
    printer.bold(false);
    printer.alignCenter();
    printer.newLine();
    printer.println(`Payment: ${order.paymentMethod}`);
    if (order.r2oReceiptNo) printer.println(`POS receipt: ${order.r2oReceiptNo}`);
    printer.newLine();
    printer.cut();

    await printer.execute();
    return { printed: true };
  } catch (err) {
    return { printed: false, reason: err.message };
  }
}

module.exports = { printOrderTicket };
