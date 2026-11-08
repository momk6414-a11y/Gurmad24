#!/usr/bin/env python3
"""Generates the page banners used on dashboards (public/img/banner-*.svg).
No filters, no raster data: crisp on every phone and cheap to cache.  Run from repo root."""
import os
PUB = os.path.join(os.path.dirname(__file__), '..', 'public')

ICONS = {
 'shield': '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>',
 'lock': '<rect x="7.5" y="11" width="9" height="7" rx="1.5"/><path d="M9.5 11V9a2.5 2.5 0 0 1 5 0v2"/>',
 'check': '<path d="M7.5 12.5l3 3 6-6.5"/>',
 'chart': '<path d="M5 19V11M12 19V5M19 19v-6"/>',
 'users': '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16.5 6.5a2.5 2.5 0 0 1 0 5M17 14c2.3.4 3.5 2 3.5 5"/>',
 'cross': '<path d="M12 5v14M5 12h14"/>',
 'building': '<path d="M5 21V8l7-4 7 4v13zM9.5 21v-4.5h5V21M12 9v4M10 11h4"/>',
 'ambulance': '<path d="M3 17V8h11v9M14 11h4l3 3v3h-2.5M3 17h2.5M9.5 17h6"/><circle cx="7.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/><path d="M8.5 10v4M6.5 12h4"/>',
 'badge': '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M12 8.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z"/>',
 'flame': '<path d="M12 3c.7 3.6 4.7 5.2 4.7 9.6a4.7 4.7 0 0 1-9.4 0c0-2 1-3.3 2.1-4.1 0 1.8.8 2.8 1.9 2.8C11.6 8.2 10.6 6 12 3z"/>',
 'radar': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/><circle cx="16.5" cy="14.5" r=".9"/><circle cx="8" cy="8.5" r=".9"/>',
 'pin': '<path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',
 'card': '<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M3.5 10.5h17M7 15h4"/>',
 'heart': '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
 'flask': '<path d="M9.5 3h5M10.5 3v6L5.2 18a2 2 0 0 0 1.8 3h10a2 2 0 0 0 1.8-3L13.5 9V3M8 15h8"/>',
 'alert': '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
 'doc': '<path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5"/>',
 'calendar': '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
}
def ic(name, cx, cy, size, color='#e8fffa', sw=1.7):
    s = size / 24
    return f'<g transform="translate({cx - size/2:.1f} {cy - size/2:.1f}) scale({s:.3f})" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{ICONS[name]}</g>'

def banner(name, accent, main, tiles, second=None):
    t = []
    pos = [(262, 58), (338, 96), (414, 56)]
    for (x, y), n in zip(pos, tiles):
        t.append(f'<rect x="{x-28}" y="{y-28}" width="56" height="56" rx="14" fill="#0e3a44" stroke="{accent}" stroke-opacity=".55"/>' + ic(n, x, y, 26, accent))
    sec = ic(second, 540, 80, 34, accent, 1.5) if second else ''
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160" role="img" aria-label="">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d3039"/><stop offset="1" stop-color="#06191f"/></linearGradient>
<radialGradient id="glow" cx="540" cy="80" r="140" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{accent}" stop-opacity=".38"/><stop offset="1" stop-color="{accent}" stop-opacity="0"/></radialGradient>
<pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#ffffff" fill-opacity=".07"/></pattern>
</defs>
<rect width="640" height="160" rx="22" fill="url(#bg)"/>
<rect width="640" height="160" rx="22" fill="url(#dots)"/>
<rect width="640" height="160" rx="22" fill="url(#glow)"/>
<path d="M0 132h120l14-22 18 40 16-30 12 12h84" fill="none" stroke="{accent}" stroke-opacity=".55" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M370 128h270" stroke="#ffffff" stroke-opacity=".08" stroke-width="2"/>
{''.join(t)}
<circle cx="540" cy="80" r="62" fill="#0b2d36" stroke="{accent}" stroke-opacity=".7" stroke-width="2"/>
<circle cx="540" cy="80" r="50" fill="none" stroke="{accent}" stroke-opacity=".25" stroke-dasharray="3 6"/>
{ic(main, 540, 80, 58, '#f4fffb', 1.6)}
{sec}
</svg>
'''
    open(os.path.join(PUB, 'img', f'banner-{name}.svg'), 'w').write(svg)

banner('admin',     '#48e0b2', 'shield',    ['chart', 'users', 'building'])
banner('security',  '#fbbf24', 'lock',      ['check', 'alert', 'doc'])
banner('ops',       '#60a5fa', 'radar',     ['pin', 'ambulance', 'alert'])
banner('ambulance', '#38a1f5', 'ambulance', ['pin', 'heart', 'alert'])
banner('police',    '#8b7cf6', 'badge',     ['shield', 'pin', 'alert'])
banner('fire',      '#f2724a', 'flame',     ['pin', 'alert', 'users'])
banner('hospital',  '#48e0b2', 'building',  ['card', 'calendar', 'heart'])
banner('lab',       '#a78bfa', 'flask',     ['doc', 'chart', 'check'])
banner('patient',   '#48e0b2', 'heart',     ['card', 'pin', 'calendar'])
print('ok')
