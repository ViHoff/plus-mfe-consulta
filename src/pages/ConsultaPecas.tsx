import React, { useState, ChangeEvent, FormEvent } from "react";
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Chip,
  CircularProgress,
} from "@mui/material";
import { secureFetch } from "../api";


export interface SizeResponseDto {
  id: string;
  nome: string; 
  descricao: string | null;
  ativo: boolean;
}

export interface VariantResponseDto {
  id: string;
  produtoId: string;
  tamanhoId: string;
  tamanho: SizeResponseDto | null;
  cor: string;
  sku: string;
  ativo: boolean;
  criadoEm: string | null;
  atualizadoEm: string | null;
}

export interface ProductDetailResponseDto {
  id: string;
  nome: string;
  descricao: string | null;
  marca: string | null;
  preco: number;
  ativo: boolean;
  categoriaId: string | null;
  fornecedorId: string | null;
  criadoEm: string;
  atualizadoEm: string;
  variantes: VariantResponseDto[];
}

export default function ConsultaPecas() {

  const [filtros, setFiltros] = useState({
    nome: "",
    tamanho: "",
    cor: ""
  });

  // Dizemos ao TypeScript que este array só aceita produtos do tipo correto
  const [produtos, setProdutos] = useState<ProductDetailResponseDto[]>([]); 
  const [carregando, setCarregando] = useState<boolean>(false);

  const lidarComBusca = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCarregando(true);

    try {
      // 1. Monta os parâmetros da URL apenas com os campos que o usuário preencheu
      const parametros = new URLSearchParams();
      if (filtros.nome) parametros.append("nome", filtros.nome);
      if (filtros.cor) parametros.append("cor", filtros.cor);
      if (filtros.tamanho) parametros.append("tamanho", filtros.tamanho);

      // 2. Chama a API real na porta 3067 usando secureFetch
      const url = `http://localhost:3067/consulta/buscarPecas?${parametros.toString()}`;
      
      const resposta = await secureFetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      });

      if (!resposta.ok) {
        throw new Error("Falha ao buscar os dados da API");
      }

      // 3. Converte a resposta para JSON
      const dados = await resposta.json();

      // 4. Salva a lista de produtos! 
      // Lembre-se: seu contrato diz que o back-end retorna um objeto com { items, page, totalItems... }
      // Então a nossa array real de produtos mora dentro de "dados.items"
      setProdutos(dados.items || []);

    } catch (erro) {
      console.error("Erro na busca:", erro);
      alert("Erro ao buscar os produtos. Verifique se o Back-end está rodando!");
    } finally {
      setCarregando(false);
    }
  };

  // Tipando o "e" como um evento de input de texto
  const lidarComMudancaFiltro = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  // ==========================================
  // 4. RENDERIZAÇÃO
  // ==========================================
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
        Consulta de Peças
      </Typography>

      <Box 
        component="form" 
        onSubmit={lidarComBusca} 
        sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <TextField
          label="Nome da peça"
          name="nome"
          value={filtros.nome}
          onChange={lidarComMudancaFiltro}
          variant="outlined"
          size="small"
        />
        <TextField
          label="Cor"
          name="cor"
          value={filtros.cor}
          onChange={lidarComMudancaFiltro}
          variant="outlined"
          size="small"
          sx={{ width: 120 }}
        />
        <TextField
          label="Tamanho"
          name="tamanho"
          value={filtros.tamanho}
          onChange={lidarComMudancaFiltro}
          variant="outlined"
          size="small"
          sx={{ width: 100 }}
        />
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          disabled={carregando}
        >
          {carregando ? <CircularProgress size={24} color="inherit" /> : "Buscar"}
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
          gap: 3,
        }}
      >
        {produtos.length === 0 && !carregando ? (
          <Box sx={{ gridColumn: "1 / -1" }}>
            <Typography variant="body1" color="text.secondary">
              Nenhum produto encontrado. Faça uma busca acima.
            </Typography>
          </Box>
        ) : (
          produtos.map((produto) => (
            <Card key={produto.id} sx={{ height: "100%", display: "flex", flexDirection: "column", boxShadow: 3 }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="h2" gutterBottom>
                  {produto.nome}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Marca: {produto.marca || "Sem marca"}
                </Typography>

                <Typography variant="h5" color="primary" sx={{ my: 2 }}>
                  R$ {produto.preco.toFixed(2).replace(".", ",")}
                </Typography>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
                  {produto.variantes.map((variante) => (
                    <Chip
                      key={variante.id}
                      label={`${variante.cor} - ${variante.tamanho?.nome || "N/A"}`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    </Container>
  );
}