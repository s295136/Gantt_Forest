const GAS_URL_KEY = 'gantt_gas_url';
const GSHEET_ID_KEY = 'gantt_gsheet_id';

export class StorageService {
    static getSettings() {
        return {
            spreadsheetId: localStorage.getItem(GSHEET_ID_KEY) || '1BayDM5Y9pMS9uVzaldHUTo7CLulD_etfZufXR6QrigY',
            gasWebappUrl: localStorage.getItem(GAS_URL_KEY) || 'https://script.google.com/macros/s/AKfycbwVJJvvAnX6768WFY9-QY6vbDeGQnJM2rFFZEEdGr8zVJvpZFM3LBqSBWYNIVPnwp2O/exec'
        };
    }

    static saveSettings(spreadsheetId, gasWebappUrl) {
        localStorage.setItem(GSHEET_ID_KEY, spreadsheetId);
        localStorage.setItem(GAS_URL_KEY, gasWebappUrl);
    }

    static exportJSON(tasks, filename) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", filename);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }
}