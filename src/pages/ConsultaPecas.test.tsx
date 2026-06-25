import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ConsultaPecas from "./ConsultaPecas";

// Mock do secureFetch para evitar chamadas de API reais nos testes
jest.mock("../api", () => ({
  secureFetch: jest.fn(),
}));

describe("ConsultaPecas Component", () => {
  it("Verifica se o título 'Consulta de Peças' aparece na tela", () => {
    render(<ConsultaPecas />);
    
    const titulo = screen.getByRole("heading", { name: /Consulta de Peças/i });
    expect(titulo).toBeInTheDocument();
  });

  it("Verifica se o botão 'Buscar' está presente", () => {
    render(<ConsultaPecas />);
    
    const botaoBuscar = screen.getByRole("button", { name: /Buscar/i });
    expect(botaoBuscar).toBeInTheDocument();
  });

  it("Verifica se os campos de filtro (Nome, Cor, Tamanho, Categoria) estão presentes", () => {
    render(<ConsultaPecas />);
    
    // Campo de Nome (TextField com label "Nome da peça")
    const campoNome = screen.getByLabelText(/Nome da peça/i);
    expect(campoNome).toBeInTheDocument();

    // Campo de Cor (TextField com label "Cor")
    const campoCor = screen.getByLabelText(/Cor/i);
    expect(campoCor).toBeInTheDocument();

    // Campo de Categoria (Select/InputLabel com label "Categoria")
    const campoCategoria = screen.getByLabelText(/Categoria/i);
    expect(campoCategoria).toBeInTheDocument();

    // Campo de Tamanho (TextField com label "Tamanho")
    const campoTamanho = screen.getByLabelText(/Tamanho/i);
    expect(campoTamanho).toBeInTheDocument();
  });

  it("Verifica se a mensagem 'Nenhum produto encontrado' aparece quando não há resultados", () => {
    render(<ConsultaPecas />);
    
    const mensagemNenhumProduto = screen.getByText(/Nenhum produto encontrado/i);
    expect(mensagemNenhumProduto).toBeInTheDocument();
  });
});
