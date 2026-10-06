<template>
    <div class="card mt-3 mb-3">
        <img src="https://brandlogos.net/wp-content/uploads/2023/12/banco_inter-logo_brandlogos.net_qybid-300x78.png" class="w-25 card-img-top mx-auto my-3 d-block" alt="Logo do Banco">
        <div class="card-body">
            <h4 class="card-title text-center"><b>Comprovante de transação Pix</b></h4>
            <hr>
            <h5 class="card-title"><b>Dados do pagador</b></h5>
            <p class="card-text">
                <b>Nome:</b> {{ comprovante.nomePagador }} <br>
                <b>CPF:</b> {{ comprovante.cpfPagador }} <br>
                <b>Instituição:</b> {{ bancoInfo(comprovante.instituicao)?.nome }}
            </p>
            <h5 class="card-title"><b>Dados do pagamento</b></h5>
            <p class="card-text">
                <b>Valor:</b> {{ formataMoedaBRL(comprovante.valor) }} <br>
                <b>Descrição:</b> {{ comprovante.descricao || 'Transferência Pix' }} <br>
                <b>Id da transação:</b> {{ comprovante.transacao || 'E00416968' }} <br>
                <b>Data e Hora:</b> {{ comprovante.dataHora }} <br>
                <b>Tipo de conta:</b> Conta Pagamento <br>
            </p>
            <h5 class="card-title"><b>Dados do recebedor</b></h5>
            <p class="card-text">
                <b>Nome:</b> {{ comprovante.nomeRecebedor || comprovante.nomePilantra || '---' }} <br>
                <b>CPF/CNPJ:</b> {{ comprovante.cpfRecebedor || comprovante.cpfPilantra || comprovante.cnpjPilantra || '---' }} <br>
                <b>Instituição:</b> {{ comprovante.instituicaoRecebedor || 'Banco Inter S.A.' }}
            </p>
        </div>
        <div class="card-footer text-center">
            <button @click="$emit('tirarFoto')" class="btn btn-danger btn-lg btn-color">ABRIR COMPROVANTE</button>
        </div>
    </div>
</template>

<style scoped>
* {
    font-family: 'Times New Roman', Times, serif;
}

.btn-color {
    font-family: Arial, Helvetica, sans-serif;
    background-color: #00FF00;
    border-color: green;
}

.btn-color:active {
    background-color: black;
}
</style>

<script setup>
import { bancoInfo, formataMoedaBRL } from '../functions';

const props = defineProps({
  comprovante: {
    bancoImgSrc: String,
    nomePagador: String,
    cpfPagador: String,
    instituicao: String,
    valor: Number,
    descricao: String,
    ano: String,
    mes: String,
    dia: String,
    hora: String,
    minuto: String,
    diaSemana: String,
    agencia: String,
    nomeRecebedor: String,
    cpfRecebedor: String,
    instituicaoRecebedor: String
  }
});
</script>
