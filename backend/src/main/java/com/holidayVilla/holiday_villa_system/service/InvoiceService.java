package com.holidayVilla.holiday_villa_system.service;

import com.holidayVilla.holiday_villa_system.entity.Payment;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.LineSeparator;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class InvoiceService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm");
    private static final DeviceRgb BRAND_BLUE = new DeviceRgb(2, 48, 71);
    private static final DeviceRgb LIGHT_BLUE = new DeviceRgb(0, 119, 182);
    private static final DeviceRgb LIGHT_GRAY = new DeviceRgb(245, 245, 245);

    public byte[] generateInvoicePdf(Payment payment) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document doc = new Document(pdfDoc);
            doc.setMargins(36, 50, 36, 50);

            String guestName    = payment.getUser().getFirstName() + " " + payment.getUser().getLastName();
            String villaName    = payment.getBooking().getVilla().getName();
            String checkIn      = payment.getBooking().getCheckInDate().format(DATE_FMT);
            String checkOut     = payment.getBooking().getCheckOutDate().format(DATE_FMT);
            String payDate      = payment.getPaymentDate() != null
                                  ? payment.getPaymentDate().format(DATETIME_FMT) : "N/A";

            // ── Header ─────────────────────────────────────────────────────────
            doc.add(new Paragraph("THE COUNTRY HOUSE")
                    .setBold().setFontSize(22)
                    .setFontColor(BRAND_BLUE)
                    .setTextAlignment(TextAlignment.CENTER));

            doc.add(new Paragraph("Payment Invoice")
                    .setFontSize(13)
                    .setFontColor(LIGHT_BLUE)
                    .setTextAlignment(TextAlignment.CENTER));

            doc.add(new LineSeparator(new SolidLine()).setMarginTop(8).setMarginBottom(16));

            // ── Invoice Number + Date ──────────────────────────────────────────
            Table headerTable = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
            headerTable.addCell(borderlessCell("Invoice #: " + payment.getTransactionReference()).setBold().setFontSize(9));
            headerTable.addCell(borderlessCell("Date: " + payDate).setTextAlignment(TextAlignment.RIGHT).setFontSize(9));
            doc.add(headerTable);

            doc.add(new Paragraph("\n"));

            // ── Guest & Booking Details ────────────────────────────────────────
            doc.add(sectionTitle("BOOKING DETAILS"));

            Table bookingTable = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
            addRow(bookingTable, "Guest Name",  guestName);
            addRow(bookingTable, "Guest Email", payment.getUser().getEmail());
            addRow(bookingTable, "Booking ID",  String.valueOf(payment.getBooking().getId()));
            addRow(bookingTable, "Villa",        villaName);
            addRow(bookingTable, "Check-In",    checkIn);
            addRow(bookingTable, "Check-Out",   checkOut);
            doc.add(bookingTable);

            doc.add(new Paragraph("\n"));

            // ── Payment Summary ────────────────────────────────────────────────
            doc.add(sectionTitle("PAYMENT SUMMARY"));

            Table payTable = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
            addRow(payTable, "Payment Type",    payment.getPaymentType().toString());
            addRow(payTable, "Payment Method",  payment.getPaymentMethod().toString());
            addRow(payTable, "Transaction Ref", payment.getTransactionReference());
            addRow(payTable, "Payment Date",    payDate);
            addRow(payTable, "Status",          payment.getPaymentStatus().toString());
            doc.add(payTable);

            doc.add(new Paragraph("\n"));

            // ── Amount Summary ─────────────────────────────────────────────────
            doc.add(sectionTitle("AMOUNT SUMMARY"));

            Table amtTable = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
            addAmountRow(amtTable, "Total Amount",     payment.getBooking().getTotalPrice(), false);
            addAmountRow(amtTable, "Amount Paid",       payment.getBooking().getAmountPaid(), false);
            addAmountRow(amtTable, "This Payment",     payment.getAmount(), false);
            addAmountRow(amtTable, "Remaining Balance", payment.getBooking().getRemainingAmount(), true);
            doc.add(amtTable);

            doc.add(new LineSeparator(new SolidLine()).setMarginTop(16).setMarginBottom(8));

            // ── Footer ─────────────────────────────────────────────────────────
            doc.add(new Paragraph("Thank you for choosing The Country House!")
                    .setItalic().setFontSize(10)
                    .setFontColor(LIGHT_BLUE)
                    .setTextAlignment(TextAlignment.CENTER));

            doc.close();
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Failed to generate invoice PDF for payment {}: {}", payment.getId(), e.getMessage());
            throw new RuntimeException("Failed to generate invoice PDF", e);
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private Paragraph sectionTitle(String text) {
        return new Paragraph(text)
                .setBold().setFontSize(10)
                .setFontColor(ColorConstants.WHITE)
                .setBackgroundColor(BRAND_BLUE)
                .setPadding(5);
    }

    private Cell borderlessCell(String text) {
        return new Cell().add(new Paragraph(text)).setBorder(null).setPadding(3);
    }

    private void addRow(Table table, String label, String value) {
        table.addCell(new Cell().add(new Paragraph(label).setBold().setFontSize(10))
                .setBackgroundColor(LIGHT_GRAY).setBorderBottom(null).setPadding(5));
        table.addCell(new Cell().add(new Paragraph(value).setFontSize(10))
                .setBorderBottom(null).setPadding(5));
    }

    private void addAmountRow(Table table, String label, Double amount, boolean highlight) {
        String formatted = String.format("LKR %,.2f", amount);
        Cell labelCell = new Cell().add(new Paragraph(label).setBold().setFontSize(10))
                .setBackgroundColor(LIGHT_GRAY).setBorderBottom(null).setPadding(5);
        Cell valueCell = new Cell().add(new Paragraph(formatted).setFontSize(10))
                .setBorderBottom(null).setPadding(5);
        if (highlight) {
            labelCell.setFontColor(LIGHT_BLUE);
            valueCell.setFontColor(LIGHT_BLUE).setBold();
        }
        table.addCell(labelCell);
        table.addCell(valueCell);
    }
}
