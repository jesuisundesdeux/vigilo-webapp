import * as vigilo from './vigilo-api';
import * as vigiloconfig from './vigilo-config';
import i18next from 'i18next';
import { issueStatus, periodStart } from './dataManager';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
Chart.register(...registerables);

/*
 * Statistics: headline numbers, then charts for the chosen period (30 days, 12 months, all).
 * One series per chart (the categories keep their own color only as a dot beside their name).
 */
const ACCENT = '#2a78d6';
const ACCENT_TRACK = '#cde2fb';
const INK = '#1f2328';
const INK_SOFT = '#5f6b7a';
const GRID = '#e3e6ea';
// ordinal ramp (validated): the further the resolution, the darker; not moderated: neutral gray
const STATUS_ORDER = ['unapproved', 'unresolved', 'taked', 'inprogress', 'done', 'resolved'];
const STATUS_COLORS = {
    unapproved: '#c3c2b7', unresolved: '#86b6ef', taked: '#5598e7', inprogress: '#2a78d6', done: '#1c5cab', resolved: '#0d366b'
};
// sequential ramp of the heatmap (0 = surface)
const HEAT = ['#f4f5f7', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#104281'];

let issues = [];
let cats = {};
let period = '12m';
let trendChart = null;

function locale() {
    return (i18next.language || 'fr_FR').replace('_', '-');
}
function fmt(n) {
    return Number(n).toLocaleString(locale());
}
function pct(part, total) {
    return total ? Math.round(part * 100 / total) + ' %' : '–';
}
function startOfDay(d) {
    var x = new Date(d.getTime());
    x.setHours(0, 0, 0, 0);
    return x;
}
function startOfMonth(d) {
    var x = startOfDay(d);
    x.setDate(1);
    return x;
}

export async function init() {
    try {
        issues = await vigilo.getIssues();
        cats = await vigiloconfig.getCategories();
    } catch (e) {
        return;
    }
    $('.stats-periods button').on('click', function () {
        period = $(this).data('period');
        $('.stats-periods button').removeClass('active').attr('aria-pressed', 'false');
        $(this).addClass('active').attr('aria-pressed', 'true');
        renderPeriod();
    });
    $('.stats-periods button.active').attr('aria-pressed', 'true');
    initTooltip();
    renderPeriod();
    reportHeight();
}

/* Embedded (stats-iframe.html in another site): give the parent page the height of the
   content, so that the iframe has no scrollbar */
function reportHeight() {
    if (window.parent === window || !window.ResizeObserver) {
        return;
    }
    var page = document.querySelector('.stats-page');
    var last = 0;
    new ResizeObserver(() => {
        var height = Math.ceil(page.getBoundingClientRect().height);
        if (height != last) {
            last = height;
            window.parent.postMessage({ type: 'vigilo-stats-height', height: height }, '*');
        }
    }).observe(page);
}

/* ---- Headline numbers of the chosen period (same period as the charts) */
function renderKpis(selected, start) {
    var now = new Date();
    var approved = selected.filter((i) => i.approved == 1);
    var resolved = approved.filter((i) => issueStatus(i) == 'resolved').length;

    // Observations of the period
    var first = issues.reduce((min, i) => (min === null || i.date_obj < min ? i.date_obj : min), null);
    var sub = period == '30d' ? i18next.t('stats-in-30d') : period == '12m' ? i18next.t('stats-in-12m')
        : (first ? i18next.t('stats-since', { date: first.toLocaleDateString(locale(), { month: 'long', year: 'numeric' }) }) : '');
    tile('#stats-kpi-total', fmt(selected.length), sub);

    // Change against the previous period of the same length (average per month for the whole history)
    if (start === null) {
        var months = first ? Math.max(1, (now.getFullYear() - first.getFullYear()) * 12 + now.getMonth() - first.getMonth() + 1) : 1;
        tile('#stats-kpi-trend', fmt(Math.round(selected.length / months)), i18next.t('stats-per-month-avg'));
    } else {
        var prevStart = new Date(start);
        if (period == '30d') prevStart.setDate(prevStart.getDate() - 30);
        else prevStart.setMonth(prevStart.getMonth() - 12);
        var previous = issues.filter((i) => i.date_obj >= startOfDay(prevStart) && i.date_obj < startOfDay(start)).length;
        var delta = selected.length - previous;
        tile('#stats-kpi-trend', (delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : '') + fmt(delta),
            i18next.t(period == '30d' ? 'stats-vs-previous-30d' : 'stats-vs-previous-12m', { n: fmt(previous) }));
    }

    // Published (approved) observations of the period
    tile('#stats-kpi-published', fmt(approved.length), i18next.t('stats-published-of', { pct: pct(approved.length, selected.length) }));

    // Resolved among the published ones of the period
    tile('#stats-kpi-resolved', pct(resolved, approved.length), i18next.t('stats-resolved-of', { count: resolved, total: fmt(approved.length) }));
    $('#stats-kpi-resolved .stats-meter span').css('width', (approved.length ? resolved * 100 / approved.length : 0) + '%');
}
function tile(id, value, sub) {
    $(id + ' .stats-tile-value').text(value);
    $(id + ' .stats-tile-sub').text(sub);
}

/* ---- Charts of the chosen period */
function renderPeriod() {
    var start = period == 'all' ? null : periodStart(period == '30d' ? '30d' : '12m');
    if (start !== null && period == '12m') {
        start = startOfMonth(start);
        start.setMonth(start.getMonth() + 1);
    }
    var selected = start === null ? issues : issues.filter((i) => i.date_obj >= startOfDay(start));
    var label = i18next.t('stats-count', { count: selected.length, n: fmt(selected.length) });
    $('#stats-categories .stats-card-sub, #stats-status .stats-card-sub, #stats-heatmap .stats-card-sub').text(label);
    renderKpis(selected, start);
    renderTrend(selected, start);
    renderCategories(selected);
    renderStatus(selected);
    renderHeatmap(selected);
}

function renderTrend(selected, start) {
    // buckets: days for 30 days, months otherwise (years past 4 years of history)
    var unit = period == '30d' ? 'day' : 'month';
    var first = start;
    if (first === null) {
        first = selected.reduce((min, i) => (min === null || i.date_obj < min ? i.date_obj : min), null) || new Date();
        if ((new Date().getFullYear() - first.getFullYear()) > 4) {
            unit = 'year';
        }
    }
    function bucket(d) {
        var x = startOfDay(d);
        if (unit != 'day') x.setDate(1);
        if (unit == 'year') x.setMonth(0);
        return x.getTime();
    }
    var counts = {};
    var cursor = new Date(bucket(first));
    var end = bucket(new Date());
    while (cursor.getTime() <= end) {
        counts[cursor.getTime()] = 0;
        if (unit == 'day') cursor.setDate(cursor.getDate() + 1);
        else if (unit == 'month') cursor.setMonth(cursor.getMonth() + 1);
        else cursor.setFullYear(cursor.getFullYear() + 1);
    }
    selected.forEach((i) => {
        var b = bucket(i.date_obj);
        if (counts[b] !== undefined) counts[b]++;
    });
    var points = Object.keys(counts).map((k) => ({ x: parseInt(k), y: counts[k] }));
    var formats = { day: { day: 'numeric', month: 'long', year: 'numeric' }, month: { month: 'long', year: 'numeric' }, year: { year: 'numeric' } };
    $('#stats-trend .stats-card-sub').text(i18next.t('stats-per-' + unit));

    var data = { datasets: [{ data: points, backgroundColor: ACCENT, hoverBackgroundColor: '#1c5cab', maxBarThickness: 24, borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom' }] };
    var options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: INK, padding: 10, displayColors: false,
                callbacks: {
                    title: (items) => new Date(items[0].parsed.x).toLocaleDateString(locale(), formats[unit]),
                    label: (item) => i18next.t('stats-count', { count: item.parsed.y, n: fmt(item.parsed.y) })
                }
            }
        },
        scales: {
            x: {
                type: 'timeseries',
                time: { unit: unit },
                grid: { display: false },
                border: { color: GRID },
                ticks: {
                    color: INK_SOFT, autoSkip: true, maxRotation: 0,
                    callback: (value) => new Date(value).toLocaleDateString(locale(),
                        unit == 'day' ? { day: 'numeric', month: 'short' } : unit == 'month' ? { month: 'short', year: '2-digit' } : { year: 'numeric' })
                }
            },
            y: {
                beginAtZero: true,
                grid: { color: GRID },
                border: { display: false },
                ticks: { color: INK_SOFT, precision: 0, callback: (v) => fmt(v) }
            }
        }
    };
    if (trendChart) {
        trendChart.destroy();
    }
    trendChart = new Chart($('#stats-trend canvas')[0].getContext('2d'), { type: 'bar', data: data, options: options });
}

function renderCategories(selected) {
    var counts = {};
    selected.forEach((i) => { counts[i.categorie] = (counts[i.categorie] || 0) + 1; });
    var rows = Object.keys(counts).map((id) => ({
        id: id,
        name: cats[id] ? i18next.t('category-name-' + id) : i18next.t('stats-other'),
        color: cats[id] ? cats[id].color : '#9e9e9e',
        count: counts[id]
    })).sort((a, b) => b.count - a.count);
    var max = rows.length ? rows[0].count : 0;
    var list = $('#stats-categories .stats-ranking').empty();
    if (!rows.length) {
        list.append($('<li class="stats-empty"></li>').text(i18next.t('no-issue')));
    }
    rows.forEach((r) => {
        var tip = r.name + ' : ' + i18next.t('stats-count', { count: r.count, n: fmt(r.count) }) + ' (' + pct(r.count, selected.length) + ')';
        var li = $('<li tabindex="0"></li>').attr('data-tip', tip);
        li.append($('<span class="stats-dot"></span>').css('background', r.color));
        li.append($('<span class="stats-rank-name"></span>').text(r.name));
        li.append($('<span class="stats-rank-value"></span>').text(fmt(r.count)));
        li.append($('<span class="stats-rank-bar"><span></span></span>').find('span').css('width', (r.count * 100 / max) + '%').end());
        list.append(li);
    });
}

function renderStatus(selected) {
    var counts = {};
    selected.forEach((i) => { var s = issueStatus(i); counts[s] = (counts[s] || 0) + 1; });
    var stack = $('#stats-status .stats-stack').empty();
    var legend = $('#stats-status .stats-legend').empty();
    var described = [];
    STATUS_ORDER.forEach((s) => {
        if (!counts[s]) {
            return;
        }
        var name = i18next.t('status-' + s);
        var tip = name + ' : ' + i18next.t('stats-count', { count: counts[s], n: fmt(counts[s]) }) + ' (' + pct(counts[s], selected.length) + ')';
        described.push(tip);
        stack.append($('<span tabindex="0"></span>').attr('data-tip', tip).css({ flex: counts[s] + ' 0 0', background: STATUS_COLORS[s] }));
        var li = $('<li></li>');
        li.append($('<span class="stats-swatch"></span>').css('background', STATUS_COLORS[s]));
        li.append($('<span class="stats-rank-name"></span>').text(name));
        li.append($('<span class="stats-rank-value"></span>').text(fmt(counts[s])));
        li.append($('<span class="stats-legend-pct"></span>').text(pct(counts[s], selected.length)));
        legend.append(li);
    });
    stack.attr('aria-label', described.join(', ')).prop('hidden', described.length == 0);
    if (!described.length) {
        legend.append($('<li class="stats-empty"></li>').text(i18next.t('no-issue')));
    }
}

function renderHeatmap(selected) {
    var grid = [];
    for (var d = 0; d < 7; d++) grid.push(new Array(24).fill(0));
    selected.forEach((i) => {
        var day = (i.date_obj.getDay() + 6) % 7; // monday first
        grid[day][i.date_obj.getHours()]++;
    });
    var max = Math.max(0, ...grid.map((row) => Math.max(...row)));
    var heat = $('#stats-heatmap .stats-heat').empty();
    // day names from a known monday
    var monday = new Date(2024, 0, 1);
    var busiest = { count: 0 };
    heat.append('<span></span>');
    for (var h = 0; h < 24; h++) {
        heat.append($('<span class="stats-heat-hour"></span>').text(h % 3 == 0 ? h + 'h' : ''));
    }
    for (var d = 0; d < 7; d++) {
        var date = new Date(monday.getTime()); date.setDate(monday.getDate() + d);
        var dayName = date.toLocaleDateString(locale(), { weekday: 'long' });
        heat.append($('<span class="stats-heat-day"></span>').text(date.toLocaleDateString(locale(), { weekday: 'short' })));
        for (var h = 0; h < 24; h++) {
            var c = grid[d][h];
            var step = c == 0 ? 0 : Math.min(HEAT.length - 1, 1 + Math.floor((c / max) * (HEAT.length - 1) - 1e-9));
            var tip = dayName + ' ' + h + 'h–' + (h + 1) + 'h : ' + i18next.t('stats-count', { count: c, n: fmt(c) });
            heat.append($('<span class="stats-heat-cell"></span>').css('background', HEAT[step]).attr('data-tip', tip));
            if (c > busiest.count) busiest = { count: c, tip: tip };
        }
    }
    heat.attr('aria-label', busiest.tip ? i18next.t('stats-busiest', { what: busiest.tip }) : i18next.t('no-issue'));
    $('#stats-heatmap .stats-heat-scale i').each(function (index) { $(this).css('background', HEAT[index + 1]); });
}

/* ---- One tooltip for the HTML marks (hover and keyboard focus) */
function initTooltip() {
    var tip = $('.stats-tip');
    function show(el, x, y) {
        tip.text($(el).attr('data-tip')).prop('hidden', false);
        var w = tip.outerWidth(), hgt = tip.outerHeight();
        var left = Math.min(Math.max(8, x - w / 2), window.innerWidth - w - 8);
        var top = y - hgt - 12 < 8 ? y + 16 : y - hgt - 12;
        tip.css({ left: left + 'px', top: top + 'px' });
    }
    $('.stats-page').on('pointermove', '[data-tip]', function (e) { show(this, e.clientX, e.clientY); });
    $('.stats-page').on('focusin', '[data-tip]', function () {
        var r = this.getBoundingClientRect();
        show(this, r.left + r.width / 2, r.top);
    });
    $('.stats-page').on('pointerleave focusout', '[data-tip]', function () { tip.prop('hidden', true); });
}
