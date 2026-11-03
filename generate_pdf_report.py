"""
Generate a professional, executive-ready PDF report of the FORGE FITNESS Audit.
Uses ReportLab with high-fidelity branding, tables, badges, and layout.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# Brand Palette
COLOR_BLACK = colors.HexColor('#090B0A')
COLOR_GRAPHITE = colors.HexColor('#141714')
COLOR_SURFACE = colors.HexColor('#1A1E1A')
COLOR_BORDER = colors.HexColor('#272E27')
COLOR_LIME = colors.HexColor('#B8FF38')
COLOR_LIME_DARK = colors.HexColor('#75A81A')
COLOR_MUTED = colors.HexColor('#7A8276')
COLOR_TEXT_MAIN = colors.HexColor('#1A1A1A')
COLOR_TEXT_MUTED = colors.HexColor('#555555')
COLOR_BG_CARD = colors.HexColor('#F8FAF7')

# Priority Colors
COLOR_P0 = colors.HexColor('#DC2626') # Red
COLOR_P1 = colors.HexColor('#EA580C') # Orange
COLOR_P2 = colors.HexColor('#84CC16') # Lime/Green
COLOR_P3 = colors.HexColor('#6B7280') # Gray

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print total page count."""
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, total_pages):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_TEXT_MUTED)

        # Header (pages after page 1)
        if self._pageNumber > 1:
            self.drawString(54, 11 * inch - 36, "FORGE FITNESS — Website & Portal Audit Report")
            self.drawRightString(8.5 * inch - 54, 11 * inch - 36, "CONFIDENTIAL / PORTFOLIO REVIEW")
            self.setStrokeColor(colors.HexColor('#E5E7EB'))
            self.setLineWidth(0.5)
            self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)

        # Footer
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawString(54, 36, "FORGE FITNESS Engineering & UX Audit • Phase 1 Review")
        self.drawRightString(8.5 * inch - 54, 36, page_str)
        self.setStrokeColor(colors.HexColor('#E5E7EB'))
        self.setLineWidth(0.5)
        self.line(54, 46, 8.5 * inch - 54, 46)

        self.restoreState()


def build_pdf(filename="FORGE_FITNESS_Website_Audit_Report.pdf"):
    pdf_path = os.path.abspath(filename)
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=COLOR_BLACK,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=COLOR_LIME_DARK,
        textTransform='uppercase',
        spaceAfter=12
    )

    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=14,
        textColor=COLOR_TEXT_MUTED
    )

    h1_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=COLOR_BLACK,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SubSectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=COLOR_TEXT_MAIN,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletItem',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=13,
        textColor=COLOR_TEXT_MAIN,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=13,
        textColor=COLOR_BLACK
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=COLOR_TEXT_MAIN
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=COLOR_TEXT_MAIN
    )

    badge_p0 = ParagraphStyle('BadgeP0', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#DC2626'))
    badge_p1 = ParagraphStyle('BadgeP1', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#C2410C'))
    badge_p2 = ParagraphStyle('BadgeP2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#4D7C0F'))
    badge_p3 = ParagraphStyle('BadgeP3', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#4B5563'))

    story = []

    # =========================================================================
    # Header Banner Block
    # =========================================================================
    banner_data = [
        [
            Paragraph("FORGE FITNESS", ParagraphStyle('BLogo', fontName='Helvetica-Bold', fontSize=18, leading=20, textColor=COLOR_LIME)),
            Paragraph("ENGINEERING &amp; UX AUDIT REPORT", ParagraphStyle('BSub', fontName='Helvetica-Bold', fontSize=9, leading=11, alignment=2, textColor=colors.white))
        ],
        [
            Paragraph("Public Website • Consultation Engine • Trainer Administration Portal", ParagraphStyle('BMeta1', fontName='Helvetica', fontSize=8.5, leading=11, textColor=colors.HexColor('#A4AAA0'))),
            Paragraph("Date: October 31, 2026 • Status: Read-Only Audit", ParagraphStyle('BMeta2', fontName='Helvetica', fontSize=8.5, leading=11, alignment=2, textColor=colors.HexColor('#A4AAA0')))
        ]
    ]
    banner_table = Table(banner_data, colWidths=[3.5*inch, 3.5*inch])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_BLACK),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 14))

    # =========================================================================
    # Executive Summary Box
    # =========================================================================
    summary_html = """
    <b>Executive Overview:</b> An exhaustive, non-destructive audit of the <b>FORGE FITNESS</b> project was executed across all public pages, scripts, stylesheets, and trainer portal views. The visual branding, typography, and dark athletic theme are in excellent standing. However, critical gaps exist in the functional layer: <b>public intake submissions are completely decoupled from the trainer portal</b>, there is <b>no calendar or time-slot selector</b> for calls, the <b>online/remote coaching modality is ambiguous</b>, and several portal controls rely on unvalidated browser popups.
    """
    summary_table = Table([[Paragraph(summary_html, callout_style)]], colWidths=[7.0*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F4F6F3')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#D1D5DB')),
        ('LINELEFT', (0, 0), (-1, -1), 4, COLOR_LIME_DARK),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # =========================================================================
    # Section A: Already Working
    # =========================================================================
    story.append(Paragraph("Category A: Already Working (Functional &amp; Stable)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_LIME_DARK, spaceBefore=2, spaceAfter=8))
    
    working_items = [
        ("Sticky Navigation & ScrollSpy:", "Header dynamically elevates with dark backdrop blur on scroll. ScrollSpy reliably detects active sections (#hero, #programs, #transformations, #coach, #testimonials, #how-it-works, #consultation) and updates navigation links."),
        ("Mobile Hamburger Drawer:", "Responsive menu expands/collapses cleanly, closes on link click, closes on backdrop click, and responds to the Escape key with proper focus restoration."),
        ("Atmospheric Engine & Accessibility:", "Hero dust canvas runs smoothly; rigorously honors 'prefers-reduced-motion: reduce' by stopping animations and disabling ambient follower glows."),
        ("Metrics Counter & Scroll Reveal:", "Statistics (250+ clients, 95% retention, 5+ yrs, 100% bespoke) count up on scroll; cards smoothly fade in via IntersectionObserver."),
        ("Interactive Testimonial Switcher:", "Tab buttons (Emma R., Adam H., Marcus L.) transition quotes dynamically and update ARIA tab states (aria-selected='true/false')."),
        ("Program Pre-filler Interaction:", "Clicking 'Apply For...' on any program card automatically sets the dropdown in the consultation form, triggers a highlight ring, and scrolls to #consultation."),
        ("Accessible Legal Modals:", "Footer triggers for Privacy Policy, Terms of Service, and Disclaimer open modal dialogs, lock body scroll, and dismiss on Escape or backdrop click."),
        ("Trainer Portal Auth Guard:", "Route guards prevent unauthenticated access to dashboard.html, prefill credentials, toggle password visibility, display error alerts, and store demo sessions in localStorage."),
        ("Trainer Dashboard Router & Actions:", "Single-page hash router cleanly manages 6 views (#overview, #bookings, #consultations, #leads, #availability, #settings). Confirm, Reschedule, and Decline actions save directly to localStorage.")
    ]
    for title, desc in working_items:
        story.append(Paragraph(f"<b>• {title}</b> {desc}", bullet_style))
    
    story.append(Spacer(1, 10))

    # =========================================================================
    # Section B: Partially Working
    # =========================================================================
    story.append(Paragraph("Category B: Partially Working (Needs Refinement)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=2, spaceAfter=8))

    partial_items = [
        ("Consultation Form Validation:", "Validates on blur and submit with visual errors. However, phone validation only checks length &gt;= 7 without regex (accepts 'abcdefg'), error messages lack IDs, and inputs lack aria-describedby for screen readers."),
        ("Testimonial View Redundancy:", "Active quote updates in the primary card, but the two static cards below still display duplicate testimonials for Adam H. or Marcus L. when selected."),
        ("Availability Time Block Creation:", "Weekday toggles and delete buttons work, but adding a new time block triggers an unstyled, blocking browser window.prompt() dialog with zero time-format validation."),
        ("Availability Date Overrides:", "Existing overrides can be removed, but there is no button or dialog in the UI to add a new blackout date or holiday."),
        ("Trainer Lead Pipeline:", "Leads can be filtered and updated inline, but there is no mechanism to manually create a new walk-in or referral lead.")
    ]
    for title, desc in partial_items:
        story.append(Paragraph(f"<b>• {title}</b> {desc}", bullet_style))

    story.append(Spacer(1, 10))

    # =========================================================================
    # Section C: Not Implemented
    # =========================================================================
    story.append(Paragraph("Category C: Not Implemented (Missing Features)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=2, spaceAfter=8))

    missing_items = [
        ("Public Form to Dashboard Pipeline:", "Consultation submissions simulate an 850ms latency, show a confirmation modal, and reset. The data is never written to localStorage['forge_trainer_leads'] or TrainerStore, leaving the trainer portal completely oblivious to website inquiries."),
        ("Consultation Date & Time Selector:", "The website repeatedly urges visitors to 'Book Your Strategy Call', but the form has no calendar or time slot picker. It operates strictly as an asynchronous inquiry form."),
        ("Social Proof & Community Links:", "The footer has internal anchor links but zero social media profiles (Instagram, YouTube, LinkedIn). For a premium personal trainer, video proof and community presence are vital."),
        ("Coaching Modality & Facility Notice:", "No clear statement informs visitors whether coaching is online, in-person, or hybrid. Prospective clients cannot tell if they need to be in the coach's city."),
        ("Program Pricing Guidance:", "Programs provide no starting prices, investment ranges, or minimum commitment lengths (e.g., 12-week minimum)."),
        ("Remote Database Integration:", "The architecture is 100% frontend demo; no remote API (Supabase, Firebase, Node) or automated email notification is currently connected.")
    ]
    for title, desc in missing_items:
        story.append(Paragraph(f"<b>• {title}</b> {desc}", bullet_style))

    story.append(Spacer(1, 10))

    # =========================================================================
    # Section D & E: Confusing UX & Potential Bugs
    # =========================================================================
    story.append(Paragraph("Category D &amp; E: Confusing UX &amp; Technical Deficiencies", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=2, spaceAfter=8))

    ux_bugs = [
        ("Dual Scroll Conflict on Program Cards:", "Program card anchor tags combine href='#consultation' with JS scrollIntoView without e.preventDefault(), creating jittery dual-scrolling on mobile Safari and Chrome Android."),
        ("Modal Keyboard Trapping:", "The intake confirmation modal and all Trainer Portal dialogs do not close on the Escape key, do not trap Tab focus, and allow users to tab through background elements."),
        ("Goal Dropdown Mismatch:", "The intake dropdown contains 'Strength & Athleticism', but the Programs section only offers Fat Loss, Hypertrophy, and Executive 1-on-1."),
        ("Demo Banner in Success Modal:", "Declares 'Frontend Demo Only • Phase 1 Simulation' upon form submission, signaling to genuine prospective clients that the coach is not accepting applications."),
        ("Transformation Cards Lack Media:", "Statistics (e.g. 94kg -> 82kg) are displayed purely in text without before/after imagery, weakening client conversion confidence.")
    ]
    for title, desc in ux_bugs:
        story.append(Paragraph(f"<b>• {title}</b> {desc}", bullet_style))

    story.append(Spacer(1, 14))

    # =========================================================================
    # Section F: Prioritized Remediation Plan Table
    # =========================================================================
    story.append(KeepTogether([
        Paragraph("Category F: Prioritized Remediation Plan", h1_style),
        HRFlowable(width="100%", thickness=1, color=COLOR_LIME_DARK, spaceBefore=2, spaceAfter=8),
        Paragraph("The matrix below outlines the systematic roadmap to resolve all audit findings without altering the existing visual design.", body_style),
        Spacer(1, 6)
    ]))

    table_data = [
        [
            Paragraph("PRIORITY", table_header_style),
            Paragraph("FEATURE / DEFECT", table_header_style),
            Paragraph("LOCATION", table_header_style),
            Paragraph("PROPOSED REMEDIATION", table_header_style)
        ],
        # P0 Items
        [
            Paragraph("<b>P0</b><br/>Critical", badge_p0),
            Paragraph("Public Submissions Lost (No Portal Sync)", table_cell_bold),
            Paragraph("main.js &amp;<br/>trainer-data.js", table_cell_style),
            Paragraph("Connect public form submission directly to TrainerStore. Save submission as a new lead record (LD-xxx), create notification, and display in Trainer Dashboard.", table_cell_style)
        ],
        [
            Paragraph("<b>P0</b><br/>Critical", badge_p0),
            Paragraph("'Book Call' Expectation vs. Intake Reality", table_cell_bold),
            Paragraph("index.html<br/>(#consultation)", table_cell_style),
            Paragraph("Add Preferred Date &amp; Time Slot selector to the intake form, OR rephrase headline to 'Request Your 1-on-1 Consultation' with clear explanation of next steps.", table_cell_style)
        ],
        [
            Paragraph("<b>P0</b><br/>Critical", badge_p0),
            Paragraph("Dual-Scroll Conflict on Program CTAs", table_cell_bold),
            Paragraph("main.js<br/>(initProgramSelection)", table_cell_style),
            Paragraph("Add e.preventDefault() in program button event listener to prevent simultaneous native anchor jump and smooth scroll.", table_cell_style)
        ],
        # P1 Items
        [
            Paragraph("<b>P1</b><br/>Important", badge_p1),
            Paragraph("Online Coaching Ambiguity", table_cell_bold),
            Paragraph("index.html<br/>(Hero &amp; Coach)", table_cell_style),
            Paragraph("Add clear micro-copy: '100% Online &amp; Remote Worldwide Coaching — Custom frameworks tailored to your local gym or home setup.'", table_cell_style)
        ],
        [
            Paragraph("<b>P1</b><br/>Important", badge_p1),
            Paragraph("Browser prompt() in Availability", table_cell_bold),
            Paragraph("trainer-dashboard.js<br/>(promptAddTimeSlot)", table_cell_style),
            Paragraph("Replace native window.prompt() with an in-app modal containing validated Start Time and End Time dropdown selectors.", table_cell_style)
        ],
        [
            Paragraph("<b>P1</b><br/>Important", badge_p1),
            Paragraph("Missing Date Override Creation", table_cell_bold),
            Paragraph("trainer-dashboard.js &amp;<br/>dashboard.html", table_cell_style),
            Paragraph("Add '+ Add Date Override' button and modal allowing the trainer to block holidays and unavailable dates.", table_cell_style)
        ],
        [
            Paragraph("<b>P1</b><br/>Important", badge_p1),
            Paragraph("Missing 'Add Lead' in Pipeline", table_cell_bold),
            Paragraph("trainer-dashboard.js &amp;<br/>dashboard.html", table_cell_style),
            Paragraph("Provide an '+ Add New Lead' button with modal form to log phone, WhatsApp, or referral inquiries manually.", table_cell_style)
        ],
        [
            Paragraph("<b>P1</b><br/>Important", badge_p1),
            Paragraph("Testimonial Quote Duplication", table_cell_bold),
            Paragraph("index.html &amp; main.js<br/>(#testimonials)", table_cell_style),
            Paragraph("Dynamically filter bottom cards so they always display the other two athletes instead of duplicating the active featured quote.", table_cell_style)
        ],
        # P2 Items
        [
            Paragraph("<b>P2</b><br/>Useful", badge_p2),
            Paragraph("Direct WhatsApp Chat Link", table_cell_bold),
            Paragraph("index.html<br/>(#consultation)", table_cell_style),
            Paragraph("Add a secondary CTA button: 'Prefer quick chat? Message Coach Haisam on WhatsApp →' linking to wa.me endpoint.", table_cell_style)
        ],
        [
            Paragraph("<b>P2</b><br/>Useful", badge_p2),
            Paragraph("Modal Keyboard Focus Trap &amp; Escape", table_cell_bold),
            Paragraph("main.js &amp;<br/>trainer-dashboard.js", table_cell_style),
            Paragraph("Add Escape key listeners and focus trapping across all public and portal modals for accessibility compliance.", table_cell_style)
        ],
        [
            Paragraph("<b>P2</b><br/>Useful", badge_p2),
            Paragraph("Strict Phone &amp; ARIA Validation", table_cell_bold),
            Paragraph("main.js<br/>(validateField)", table_cell_style),
            Paragraph("Validate phone against numeric integrity regex and bind error messages to inputs using aria-describedby.", table_cell_style)
        ],
        # P3 Items
        [
            Paragraph("<b>P3</b><br/>Optional", badge_p3),
            Paragraph("Social Media Links in Footer", table_cell_bold),
            Paragraph("index.html<br/>(Footer)", table_cell_style),
            Paragraph("Add branded social links (Instagram, YouTube, LinkedIn) in the public footer.", table_cell_style)
        ],
        [
            Paragraph("<b>P3</b><br/>Optional", badge_p3),
            Paragraph("Program Starting Investment", table_cell_bold),
            Paragraph("index.html<br/>(#programs)", table_cell_style),
            Paragraph("Add indicative 'From $X/month' pricing and minimum commitment durations on program cards.", table_cell_style)
        ]
    ]

    plan_table = Table(table_data, colWidths=[0.8*inch, 1.8*inch, 1.4*inch, 3.0*inch], repeatRows=1)
    plan_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_BLACK),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
    ]))

    story.append(plan_table)
    story.append(Spacer(1, 14))

    # Concluding signature
    sign_html = """
    <b>Report Sign-off:</b> Audit compiled for <b>FORGE FITNESS</b>. No files have been modified. Implementation of recommended items will proceed upon user direction and approval.
    """
    story.append(Paragraph(sign_html, ParagraphStyle('Sign', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=8, leading=12, textColor=COLOR_TEXT_MUTED)))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {pdf_path}")
    return pdf_path

if __name__ == '__main__':
    build_pdf()
