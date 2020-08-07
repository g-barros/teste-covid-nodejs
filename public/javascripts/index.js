const uf = document.URL.substr(document.URL.indexOf('=')+1, 2);
const opcoes = document.getElementsByTagName('option');

for (opcao of opcoes) {
    if (opcao.value === uf) {
        opcao.selected = true;
    }
}