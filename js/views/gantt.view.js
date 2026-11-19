import { formatDateISO, addDays, parseDate, diffDays } from '../utils/date.js';

export class GanttView {
    constructor(elements, onOpenEditModal) {
        this.timelineMonthHeader = elements.timelineMonthHeader;
        this.timelineDayHeader = elements.timelineDayHeader;
        this.ganttBgGrid = elements.ganttBgGrid;
        this.ganttBarsContainer = elements.ganttBarsContainer;
        this.svgLayer = elements.svgLayer;
        this.onOpenEditModal = onOpenEditModal;
    }

    renderHeadersAndGrid(startDate, totalDays, cellWidth) {
        this.timelineMonthHeader.innerHTML = '';
        this.timelineDayHeader.innerHTML = '';

        const totalWidth = totalDays * cellWidth;
        this.timelineMonthHeader.style.width = `${totalWidth}px`;
        this.timelineDayHeader.style.width = `${totalWidth}px`;
        this.ganttBgGrid.style.width = `${totalWidth}px`;

        const todayStr = formatDateISO(new Date());
        let currentMonth = '';
        let currentMonthWidth = 0;
        let currentMonthDiv = null;

        for (let i = 0; i < totalDays; i++) {
            const d = addDays(startDate, i);
            const monthStr = `${d.getFullYear()}年${d.getMonth() + 1}月`;
            const dayNum = d.getDate();
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const isToday = formatDateISO(d) === todayStr;

            if (monthStr !== currentMonth) {
                currentMonth = monthStr;
                currentMonthDiv = document.createElement('div');
                currentMonthDiv.className = 'border-r border-slate-300 px-2 flex items-center font-bold text-slate-700 truncate';
                currentMonthDiv.textContent = monthStr;
                this.timelineMonthHeader.appendChild(currentMonthDiv);
                currentMonthWidth = 0;
            }
            currentMonthWidth += cellWidth;
            currentMonthDiv.style.width = `${currentMonthWidth}px`;

            const dayCell = document.createElement('div');
            dayCell.style.width = `${cellWidth}px`;
            dayCell.className = `shrink-0 text-center border-r border-slate-200 flex items-center justify-center font-semibold text-[10px] ${
                isToday ? 'bg-amber-200 text-amber-900 font-bold' : isWeekend ? 'bg-slate-200/80 text-slate-500' : 'text-slate-600'
            }`;
            dayCell.textContent = dayNum;
            this.timelineDayHeader.appendChild(dayCell);
        }

        this.ganttBgGrid.innerHTML = '';
        for (let i = 0; i < totalDays; i++) {
            const d = addDays(startDate, i);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const isToday = formatDateISO(d) === todayStr;
            const gridCol = document.createElement('div');
            gridCol.style.left = `${i * cellWidth}px`;
            gridCol.style.width = `${cellWidth}px`;
            gridCol.className = `absolute top-0 bottom-0 border-r border-slate-200/60 ${isToday ? 'gantt-today' : isWeekend ? 'gantt-weekend' : ''}`;
            this.ganttBgGrid.appendChild(gridCol);
        }
    }

    renderBars(tasks, startDate, totalDays, cellWidth, rowHeight) {
        this.ganttBarsContainer.innerHTML = '';
        const totalHeight = Math.max(tasks.length * rowHeight, 400);
        this.ganttBarsContainer.style.height = `${totalHeight}px`;
        this.ganttBgGrid.style.height = `${totalHeight}px`;
        this.svgLayer.style.height = `${totalHeight}px`;

        tasks.forEach(t => {
            const row = document.createElement('div');
            row.className = 'relative flex items-center h-[40px] border-b border-slate-200/60';
            row.style.width = `${totalDays * cellWidth}px`;

            const st = parseDate(t.start);
            const offsetDays = diffDays(st, startDate);
            const leftPx = offsetDays * cellWidth;
            const widthPx = Math.max(12, (t.duration || 0) * cellWidth);
            const progressVal = Math.round(parseFloat(t.progress) || 0);

            if (t.isMilestone || t.duration === 0) {
                const diamond = document.createElement('div');
                diamond.className = 'absolute transform rotate-45 bg-amber-500 border-2 border-amber-600 w-4 h-4 shadow cursor-pointer transition-transform hover:scale-125 z-20';
                diamond.style.left = `${leftPx + (cellWidth / 2) - 8}px`;
                diamond.title = `${t.name} (里程碑: ${t.start})`;
                diamond.onclick = () => this.onOpenEditModal(t.id);
                row.appendChild(diamond);
            } else {
                const bar = document.createElement('div');
                const isParent = t.parentId === null;
                let colorClass = 'gantt-bar-normal';
                if (isParent) colorClass = 'gantt-bar-parent';
                else if (t.color === 'red' || t.color === 'rose') colorClass = 'gantt-bar-red';
                else if (t.color === 'emerald') colorClass = 'gantt-bar-emerald';
                else if (t.color === 'purple') colorClass = 'gantt-bar-purple';
                else if (t.color === 'amber') colorClass = 'gantt-bar-amber';

                bar.className = `absolute h-6 rounded-md shadow-sm ${colorClass} text-white text-[10px] flex items-center overflow-hidden cursor-pointer group transition-shadow hover:shadow-md z-10`;
                bar.style.left = `${leftPx}px`;
                bar.style.width = `${widthPx}px`;
                bar.dataset.id = t.id;

                const progressFill = document.createElement('div');
                progressFill.className = 'h-full bg-black/25 transition-all duration-300';
                progressFill.style.width = `${progressVal}%`;
                bar.appendChild(progressFill);

                const label = document.createElement('span');
                label.className = 'absolute left-2 font-medium truncate pointer-events-none drop-shadow-sm pr-2';
                label.textContent = `${t.name} (${progressVal}%)`;
                bar.appendChild(label);

                bar.onclick = () => this.onOpenEditModal(t.id);
                row.appendChild(bar);
            }
            this.ganttBarsContainer.appendChild(row);
        });
    }

    renderDependencies(tasks, startDate, cellWidth, rowHeight) {
        this.svgLayer.innerHTML = '<defs><marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" /></marker></defs>';
        tasks.forEach((t, targetIdx) => {
            if (!t.predecessor) return;
            const predIds = String(t.predecessor).split(',').map(s => parseInt(s.trim()));
            predIds.forEach(predId => {
                const predTask = tasks.find(p => p.id === predId);
                if (!predTask) return;
                const predIdx = tasks.findIndex(p => p.id === predId);
                if (predIdx === -1) return;

                const pStart = parseDate(predTask.start);
                const pOffset = diffDays(pStart, startDate);
                const x1 = (pOffset + (predTask.duration || 1)) * cellWidth;
                const y1 = (predIdx * rowHeight) + (rowHeight / 2);

                const tStart = parseDate(t.start);
                const tOffset = diffDays(tStart, startDate);
                const x2 = tOffset * cellWidth;
                const y2 = (targetIdx * rowHeight) + (rowHeight / 2);

                const midX = x1 + 10;
                const pathD = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', pathD);
                path.setAttribute('stroke', '#64748b');
                path.setAttribute('stroke-width', '1.5');
                path.setAttribute('fill', 'none');
                path.setAttribute('marker-end', 'url(#arrow)');
                path.setAttribute('stroke-dasharray', '3,3');

                this.svgLayer.appendChild(path);
            });
        });
    }
}
