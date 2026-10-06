async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    } catch (e) {
        console.warn('Clipboard write failed:', e);
    }
}

function getBrowserDeviceInfo() {
    const ua = navigator.userAgent || '';
    let os = 'unknown';
    if (/android/i.test(ua)) os = 'android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'ios';
    else if (/windows/i.test(ua)) os = 'windows';
    else if (/mac/i.test(ua)) os = 'mac';
    else if (/linux/i.test(ua)) os = 'linux';

    let devId = 'web_' + Math.random().toString(36).slice(2, 10);
    try {
        devId = localStorage.getItem('pega_ladrao_device_id') || devId;
        localStorage.setItem('pega_ladrao_device_id', devId);
    } catch (_) {}

    return {
        deviceId: devId,
        manufacturer: navigator.vendor || 'Browser',
        model: ua.split(')')[0]?.split('(')[1] || navigator.userAgent.slice(0, 30),
        operatingSystem: os,
        osVersion: 'Web',
        platform: 'web',
        webViewVersion: navigator.appVersion ? navigator.appVersion.slice(0, 30) : 'Browser'
    };
}

function alertMessage(type, message) {
    return {
        'class': type,
        'message': message
    }
}

function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

// function notificationPermissionIsGranted() {
//     return Notification.permission === 'granted';
// }

// async function requestNotificationPermission() {
//     if (!notificationPermissionIsGranted()) {
//         await Notification.requestPermission()
//             .then(permission => {
//                 if (permission !== 'granted') {
//                     console.error('Ops! Você não concedeu permissão de notificação, pode ser que alguns recursos não funcionem adequadamente.');
//                 }
//             });
//     }
// }

async function requestCameraPermission(videoElement) {
    await navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            videoElement.srcObject = stream;
        })
        .catch((error) => {
            console.error("Error accessing the camera: ", error);
        });
}

async function getCurrentPosition() {
    const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });

    return position.coords.toJSON();
};

function maskCpf(cpf) {
    let splitted = String(cpf).replace('-', '.').split('.');
    return '***.' + splitted[1] + '.' + splitted[2] + '-**';
}

function formataMoedaBRL(valor) {
    return valor.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });
}

function formataDataHoraPtBr(date, dateStyle = 'short', timeStyle = 'long') {
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: dateStyle,
        timeStyle: timeStyle,
    }).format(date);
}

function pegaPrimeiroNome(nome) {
    return String(nome).split(' ')[0];
}

function bancoInfo(key) {
    if (key == 'bradesco') {
        return {
            nome: 'Bradesco S/A',
            nomeResumido: 'Bradesco',
            codigo: 237
        }
    }

    if (key == 'next') {
        return {
            nome: 'Next (237 - Bradesco S. A.)',
            nomeResumido: 'Next',
            codigo: 237
        }
    }

    if (key == 'inter') {
        return {
            nome: 'Banco Inter S.A.',
            nomeResumido: 'Inter',
            codigo: '077'
        }
    }

    return null;
}

export {
    copyToClipboard,
    alertMessage,
    delay,
    // notificationPermissionIsGranted,
    // requestNotificationPermission,
    requestCameraPermission,
    getCurrentPosition,
    maskCpf,
    formataMoedaBRL,
    formataDataHoraPtBr,
    pegaPrimeiroNome,
    bancoInfo,
    getBrowserDeviceInfo
}
