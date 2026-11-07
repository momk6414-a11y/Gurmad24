#!/usr/bin/env python3
"""Generate GURMAD 24 icons and illustrations (SVG + PNG).

Run from the repo root:  python3 scripts/make-art.py
PNG export needs rsvg-convert (librsvg).
"""
import math
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public')
os.makedirs(os.path.join(PUB, 'img'), exist_ok=True)
os.makedirs(os.path.join(PUB, 'icons'), exist_ok=True)

MINT, BLUE, GOLD, RED, INK = '#48e0b2', '#7cc4ff', '#ffc66e', '#ff7a7a', '#f2fbfa'


def write(path, text):
    with open(os.path.join(PUB, path), 'w', encoding='utf-8') as f:
        f.write(text)


# ---------------------------------------------------------------- app icon
def icon_svg(scale=1.0, rounded=True):
    rx = 112 if rounded else 0
    ticks = []
    for i in range(24):
        a = math.radians(i * 15 - 90)
        x1, y1 = 256 + 176 * math.cos(a), 256 + 176 * math.sin(a)
        x2, y2 = 256 + 205 * math.cos(a), 256 + 205 * math.sin(a)
        if i == 0:
            col, op = GOLD, 1
        else:
            col, op = MINT, round(0.30 + 0.70 * i / 23, 2)
        ticks.append(
            f'<path d="M{x1:.1f} {y1:.1f}L{x2:.1f} {y2:.1f}" stroke="{col}" stroke-opacity="{op}" '
            f'stroke-width="13" stroke-linecap="round"/>'
        )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14868c"/><stop offset="1" stop-color="#051a20"/></linearGradient>
<radialGradient id="r" cx=".3" cy=".2" r=".7"><stop offset="0" stop-color="{MINT}" stop-opacity=".30"/><stop offset="1" stop-color="{MINT}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="512" height="512" rx="{rx}" fill="url(#g)"/>
<rect width="512" height="512" rx="{rx}" fill="url(#r)"/>
<g transform="translate(256 256) scale({scale}) translate(-256 -256)">
<circle cx="256" cy="256" r="160" fill="#04141a" fill-opacity=".35"/>
{''.join(ticks)}
<rect x="224" y="160" width="64" height="192" rx="20" fill="{INK}"/>
<rect x="160" y="224" width="192" height="64" rx="20" fill="{INK}"/>
<path d="M190 256h40l14-36 24 72 14-36h40" fill="none" stroke="#0a8f7a" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
</g>
</svg>
'''


write('icon.svg', icon_svg())

# ---------------------------------------------------------------- hero
def windows(x0, y0, cols, rows, dx, dy, w, h, seed, fill=MINT):
    out = []
    for r in range(rows):
        for c in range(cols):
            lit = (c * 7 + r * 13 + seed) % 5 in (0, 1)
            if lit:
                out.append(f'<rect x="{x0 + c * dx}" y="{y0 + r * dy}" width="{w}" height="{h}" rx="1.5" fill="{fill}" fill-opacity=".55"/>')
    return ''.join(out)


def hero_svg():
    back = [(0, 56, 232), (56, 48, 206), (104, 46, 250), (392, 46, 226), (438, 58, 190), (496, 64, 240)]
    front = [(14, 42, 276), (60, 36, 262), (388, 40, 270), (428, 48, 246), (476, 50, 280), (526, 40, 264)]
    bg = ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{342 - y}" fill="#0b3740"/>' + windows(x + 8, y + 12, max(1, (w - 12) // 14), 6, 14, 18, 6, 8, i)
                 for i, (x, w, y) in enumerate(back))
    fr = ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{342 - y}" fill="#0e4b54"/>' + windows(x + 7, y + 10, max(1, (w - 10) // 13), 4, 13, 17, 6, 8, i + 3)
                 for i, (x, w, y) in enumerate(front))
    hosp_win = ''
    for r in range(4):
        for c in range(4):
            lit = (c + r * 3) % 4 == 1
            hosp_win += f'<rect x="{214 + c * 31}" y="{186 + r * 31}" width="19" height="21" rx="4" fill="{"#ffd98a" if lit else "#0f5f66"}"/>'
    wing_win = ''.join(f'<rect x="{x}" y="{y}" width="12" height="14" rx="3" fill="#0f5f66"/>' for x in (168, 184, 346, 362) for y in (258, 290))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 420" role="img" aria-label="GURMAD 24">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#11727a"/><stop offset="1" stop-color="#051a20"/></linearGradient>
<linearGradient id="pl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{MINT}" stop-opacity="0"/><stop offset=".45" stop-color="{MINT}"/><stop offset="1" stop-color="{BLUE}"/></linearGradient>
<linearGradient id="cd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#25aaa3"/><stop offset="1" stop-color="#0a4a52"/></linearGradient>
<radialGradient id="gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="{MINT}" stop-opacity=".30"/><stop offset="1" stop-color="{MINT}" stop-opacity="0"/></radialGradient>
<radialGradient id="rg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="{RED}" stop-opacity=".55"/><stop offset="1" stop-color="{RED}" stop-opacity="0"/></radialGradient>
<clipPath id="cl"><rect width="560" height="420" rx="28"/></clipPath>
</defs>
<g clip-path="url(#cl)">
<rect width="560" height="420" fill="url(#bg)"/>
<g stroke="{MINT}" stroke-opacity=".09" fill="none" stroke-width="2"><path d="M-20 120L260 30M-20 200L420 60M120 -10L560 140M300 -10L560 80M0 60L300 160"/></g>
<circle cx="400" cy="170" r="190" fill="url(#gl)"/>
{bg}{fr}
<rect x="160" y="240" width="40" height="102" fill="#cfe6e5"/><rect x="340" y="240" width="40" height="102" fill="#cfe6e5"/>
<rect x="200" y="172" width="140" height="170" rx="6" fill="#eaf6f5"/>
<rect x="196" y="166" width="148" height="10" rx="4" fill="#bfdcdc"/>
{hosp_win}{wing_win}
<path d="M258 342v-22a12 12 0 0 1 24 0v22z" fill="#0f5f66"/>
<rect x="248" y="124" width="44" height="44" rx="12" fill="{MINT}"/>
<rect x="264" y="132" width="12" height="28" rx="2" fill="#fff"/><rect x="256" y="140" width="28" height="12" rx="2" fill="#fff"/>
<rect y="342" width="560" height="78" fill="#05161b"/>
<path d="M0 342h560" stroke="{MINT}" stroke-opacity=".25" stroke-width="2"/>
<path d="M20 392h40M100 392h40M180 392h40M260 392h40M340 392h40M420 392h40M500 392h40" stroke="{INK}" stroke-opacity=".18" stroke-width="3" stroke-linecap="round"/>
<path d="M0 408h300l14-18 20 36 16-26 12 8h198" fill="none" stroke="url(#pl)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M126 296C150 92 380 42 452 132" fill="none" stroke="{GOLD}" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>
<ellipse cx="452" cy="134" rx="34" ry="10" fill="none" stroke="{GOLD}" stroke-opacity=".65" stroke-width="2"/>
<ellipse cx="452" cy="134" rx="58" ry="17" fill="none" stroke="{GOLD}" stroke-opacity=".3" stroke-width="2"/>
<path d="M452 134C436 110 428 98 428 84a24 24 0 0 1 48 0c0 14-8 26-24 50z" fill="{GOLD}"/>
<circle cx="452" cy="84" r="9" fill="#fff"/>
<g stroke="{MINT}" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"><path d="M18 352h36M8 364h46M24 376h30"/></g>
<circle cx="132" cy="330" r="30" fill="url(#rg)"/>
<rect x="116" y="318" width="16" height="9" rx="3" fill="{RED}"/><rect x="132" y="318" width="16" height="9" rx="3" fill="{BLUE}"/>
<path d="M66 340Q66 330 76 330H152V348H176L198 366V372Q198 378 192 378H72Q66 378 66 372Z" fill="{INK}"/>
<path d="M160 352H174L190 366H160Z" fill="{BLUE}" fill-opacity=".85"/>
<rect x="66" y="360" width="128" height="7" fill="{MINT}"/>
<rect x="103" y="337" width="10" height="18" rx="2" fill="{RED}"/><rect x="99" y="341" width="18" height="10" rx="2" fill="{RED}"/>
<circle cx="96" cy="380" r="13" fill="#0a1f24" stroke="{MINT}" stroke-width="3"/><circle cx="96" cy="380" r="4" fill="#9bbcbe"/>
<circle cx="174" cy="380" r="13" fill="#0a1f24" stroke="{MINT}" stroke-width="3"/><circle cx="174" cy="380" r="4" fill="#9bbcbe"/>
<g transform="translate(34 40) rotate(-7)">
<rect width="176" height="108" rx="16" fill="url(#cd)" stroke="{INK}" stroke-opacity=".3"/>
<rect x="16" y="18" width="34" height="26" rx="6" fill="{GOLD}"/><path d="M16 31h34M33 18v26" stroke="#b97d12" stroke-width="1.5"/>
<circle cx="146" cy="32" r="15" fill="{INK}"/><rect x="143" y="23" width="6" height="18" rx="1.5" fill="#0a8f7a"/><rect x="137" y="29" width="18" height="6" rx="1.5" fill="#0a8f7a"/>
<path d="M16 70h40l6-10 8 20 6-14 4 4h20" fill="none" stroke="{MINT}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<text x="16" y="96" font-family="system-ui,Segoe UI,Roboto,sans-serif" font-size="15" font-weight="800" letter-spacing="1.5" fill="#fff">GURMAD 24</text>
</g>
<g fill="#fff" fill-opacity=".55"><circle cx="520" cy="44" r="2.5"/><circle cx="300" cy="46" r="2"/><circle cx="60" cy="190" r="2"/><circle cx="500" cy="170" r="2"/></g>
</g>
</svg>
'''


write('img/hero.svg', hero_svg())

# ---------------------------------------------------------------- empty state
write('img/empty.svg', f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" role="img" aria-label="">
<circle cx="100" cy="76" r="62" fill="{MINT}" fill-opacity=".12"/>
<circle cx="100" cy="76" r="62" fill="none" stroke="#2fb596" stroke-opacity=".55" stroke-width="2" stroke-dasharray="3 7" stroke-linecap="round"/>
<rect x="62" y="30" width="76" height="96" rx="10" fill="#e6f7f4" stroke="#2f9c8e" stroke-width="3"/>
<rect x="82" y="22" width="36" height="16" rx="6" fill="#2f9c8e"/>
<path d="M74 60h52M74 74h52M74 88h34" stroke="#8cc9c0" stroke-width="5" stroke-linecap="round"/>
<circle cx="136" cy="104" r="21" fill="#ffffff" fill-opacity=".92" stroke="#0f5f66" stroke-width="6"/>
<path d="M151 119l16 16" stroke="#0f5f66" stroke-width="8" stroke-linecap="round"/>
<path d="M136 96v16M128 104h16" stroke="#0a8f7a" stroke-width="4" stroke-linecap="round"/>
<g fill="#2fb596" fill-opacity=".7"><circle cx="38" cy="44" r="3"/><circle cx="168" cy="40" r="2.5"/><circle cx="30" cy="104" r="2"/></g>
</svg>
''')

# ---------------------------------------------------------------- tile banners (320x112)
def banner(name, c1, c2, accent, glyph):
    write(f'img/{name}.svg', f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 112" role="img" aria-label="">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>
<clipPath id="c"><rect width="320" height="112" rx="16"/></clipPath></defs>
<g clip-path="url(#c)">
<rect width="320" height="112" fill="url(#g)"/>
<circle cx="262" cy="56" r="104" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="2"/>
<circle cx="262" cy="56" r="72" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2"/>
{glyph}
</g>
</svg>
''')


def card_glyph(accent):
    return f'''<g fill="#fff" fill-opacity=".10"><rect x="244" y="8" width="36" height="96" rx="9"/><rect x="214" y="38" width="96" height="36" rx="9"/></g>
<rect x="22" y="20" width="36" height="28" rx="6" fill="{GOLD}"/><path d="M22 34h36M40 20v28" stroke="#b97d12" stroke-width="1.5"/>
<path d="M22 86h62l9-16 12 32 10-22 6 6h120" fill="none" stroke="{accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<g fill="#fff" fill-opacity=".55"><rect x="22" y="58" width="52" height="5" rx="2.5"/></g>'''


banner('card-mint', '#14868c', '#083c44', MINT, card_glyph(MINT))
banner('card-blue', '#2a76bd', '#0b2c58', BLUE, card_glyph(BLUE))
banner('card-violet', '#6e50bd', '#27185a', '#cdbcff', card_glyph('#cdbcff'))

hospital = f'''<g fill="{INK}"><rect x="196" y="40" width="88" height="72" rx="4"/><rect x="168" y="70" width="28" height="42" fill-opacity=".8"/><rect x="284" y="70" width="28" height="42" fill-opacity=".8"/></g>
<g fill="#0f5f66">{''.join(f'<rect x="{206 + c * 24}" y="{54 + r * 22}" width="14" height="14" rx="3"/>' for c in range(3) for r in range(2))}<path d="M231 112v-14a9 9 0 0 1 18 0v14z"/></g>
<rect x="224" y="14" width="32" height="32" rx="9" fill="{MINT}"/><rect x="237" y="20" width="6" height="20" rx="1.5" fill="#fff"/><rect x="231" y="27" width="18" height="6" rx="1.5" fill="#fff"/>
<path d="M22 86h62l9-16 12 32 10-22 6 6h30" fill="none" stroke="{MINT}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<g fill="#fff" fill-opacity=".55"><rect x="22" y="30" width="60" height="6" rx="3"/><rect x="22" y="44" width="38" height="6" rx="3"/></g>'''
banner('org-hospital', '#14868c', '#083c44', MINT, hospital)

lab = f'''<path d="M246 18h32M254 18v28l-26 50a8 8 0 0 0 7 12h58a8 8 0 0 0 7-12l-26-50V18" fill="#fff" fill-opacity=".10" stroke="{INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M240 76h50l12 22a8 8 0 0 1-7 12h-60a8 8 0 0 1-7-12z" fill="{BLUE}" fill-opacity=".85"/>
<g fill="{INK}" fill-opacity=".8"><circle cx="262" cy="92" r="4"/><circle cx="278" cy="86" r="3"/><circle cx="270" cy="100" r="2.5"/></g>
<g fill="{BLUE}" fill-opacity=".8"><circle cx="262" cy="8" r="3"/><circle cx="272" cy="0" r="2"/></g>
<path d="M22 86h62l9-16 12 32 10-22 6 6h30" fill="none" stroke="{BLUE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<g fill="#fff" fill-opacity=".55"><rect x="22" y="30" width="60" height="6" rx="3"/><rect x="22" y="44" width="38" height="6" rx="3"/></g>'''
banner('org-lab', '#2a76bd', '#0b2c58', BLUE, lab)

amb = f'''<g transform="translate(182 22)">
<circle cx="48" cy="12" r="22" fill="{RED}" fill-opacity=".30"/>
<rect x="32" y="2" width="16" height="9" rx="3" fill="{RED}"/><rect x="48" y="2" width="16" height="9" rx="3" fill="{BLUE}"/>
<path d="M4 22Q4 12 14 12H84V32H108L130 52V60Q130 66 124 66H10Q4 66 4 60Z" fill="{INK}"/>
<path d="M92 36H106L122 52H92Z" fill="{BLUE}" fill-opacity=".85"/>
<rect x="4" y="50" width="122" height="7" fill="{GOLD}"/>
<rect x="36" y="22" width="10" height="18" rx="2" fill="{RED}"/><rect x="32" y="26" width="18" height="10" rx="2" fill="{RED}"/>
<circle cx="32" cy="68" r="13" fill="#0a1f24" stroke="{GOLD}" stroke-width="3"/><circle cx="106" cy="68" r="13" fill="#0a1f24" stroke="{GOLD}" stroke-width="3"/>
</g>
<path d="M150 70h32M138 82h44" stroke="{GOLD}" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>
<path d="M22 86h62l9-16 12 32 10-22 6 6h30" fill="none" stroke="{GOLD}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<g fill="#fff" fill-opacity=".55"><rect x="22" y="30" width="60" height="6" rx="3"/><rect x="22" y="44" width="38" height="6" rx="3"/></g>'''
banner('org-ambulance', '#b06f1c', '#4a2a06', GOLD, amb)

# ---------------------------------------------------------------- PNG exports
def png(svg_name, out, size):
    subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), os.path.join(PUB, svg_name), '-o', os.path.join(PUB, out)], check=True)


write('_tmp-maskable.svg', icon_svg(scale=0.78, rounded=False))
write('_tmp-apple.svg', icon_svg(scale=0.92, rounded=False))
png('icon.svg', 'icons/icon-512.png', 512)
png('icon.svg', 'icons/icon-192.png', 192)
png('_tmp-maskable.svg', 'icons/icon-maskable-512.png', 512)
png('_tmp-apple.svg', 'icons/apple-touch-icon.png', 180)
os.remove(os.path.join(PUB, '_tmp-maskable.svg'))
os.remove(os.path.join(PUB, '_tmp-apple.svg'))
print('art generated')
