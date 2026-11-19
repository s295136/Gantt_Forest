export class ApiService {
    static fetchFromGoogleSheet(gasUrl) {
        return new Promise((resolve, reject) => {
            if (!gasUrl) {
                return reject(new Error('未設定 GAS URL'));
            }
            const callbackName = 'ganttGasCallback_' + Date.now();
            const oldScript = document.getElementById('gas-jsonp-script');
            if (oldScript) oldScript.remove();

            window[callbackName] = (resData) => {
                delete window[callbackName];
                const scriptElem = document.getElementById('gas-jsonp-script');
                if (scriptElem) scriptElem.remove();
                resolve(resData);
            };

            const script = document.createElement('script');
            script.id = 'gas-jsonp-script';
            script.src = `${gasUrl}?callback=${callbackName}`;
            script.onerror = () => {
                delete window[callbackName];
                script.remove();
                reject(new Error('連線至 Google Apps Script 失敗'));
            };
            document.body.appendChild(script);
        });
    }

    static async pushToGoogleSheet(gasUrl, token, tasks) {
        const payload = { token, tasks };
        return await fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }
}
