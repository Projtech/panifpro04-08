
import jsPDF from "jspdf";
// @ts-ignore - jspdf-autotable types are incompatible with the latest jsPDF
import autoTable from "jspdf-autotable";
import { getRecipeWithIngredients } from "./recipeService";

export type PdfType = "simple" | "complete" | "costs";

export async function generateRecipePdf(companyId: string, recipeId: string, type: PdfType): Promise<void> {
  try {
    // Fetch recipe data
    const { recipe, ingredients } = await getRecipeWithIngredients(recipeId, companyId);
    
    if (!recipe) {
      throw new Error("Recipe not found");
    }
    
    // Initialize PDF
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    
    // Add header
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text(recipe.name, pageWidth / 2, 20, { align: "center" });
    
    // Add recipe code if available
    if (recipe.code) {
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Código: ${recipe.code}`, pageWidth / 2, 28, { align: "center" });
    }
    
    // Add separator line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, 32, pageWidth - 20, 32);
    
    let yPos = 40;
    
    // Add yield information
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Rendimento:", 20, yPos);
    pdf.setFont("helvetica", "normal");
    let yieldText = `${recipe.yield_kg} kg`;
    if (recipe.yield_units) {
      yieldText += ` (${recipe.yield_units} unidades)`;
    }
    pdf.text(yieldText, 55, yPos);
    
    yPos += 10;
    
    // Different content based on type
    if (type === "simple") {
      // Simple version: Recipe instructions only
      if (recipe.instructions) {
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Modo de Preparo", 20, yPos);
        yPos += 8;
        
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        
        const instructionsLines = pdf.splitTextToSize(recipe.instructions, pageWidth - 40);
        
        // Check if we need a new page
        if (yPos + instructionsLines.length * 5 > pdf.internal.pageSize.height - 20) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.text(instructionsLines, 20, yPos);
      }
    } else if (type === "complete" || type === "costs") {
      // Add ingredients table
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Ingredientes", 20, yPos);
      yPos += 8;
      
      if (ingredients.length > 0) {
        const tableData = ingredients.map(ing => [
          ing.is_sub_recipe ? "SubReceita" : "Matéria Prima",
          ing.is_sub_recipe ? (ing.sub_recipe ? ing.sub_recipe.name : "Sub-receita") 
                            : (ing.product ? ing.product.name : "Produto"),
          `${ing.quantity.toFixed(2)} ${ing.unit}`,
          type === "costs" ? `R$ ${ing.cost.toFixed(2)}` : "",
          type === "costs" ? `R$ ${ing.total_cost.toFixed(2)}` : ""
        ]);
        
        const tableHeaders = [
          "Tipo", 
          "Ingrediente", 
          "Quantidade"
        ];
        
        if (type === "costs") {
          tableHeaders.push("Custo Unit.", "Custo Total");
        }
        
        // @ts-ignore
        autoTable(pdf, {
          head: [tableHeaders],
          body: tableData,
          startY: yPos,
          margin: { left: 20, right: 20 },
          styles: { fontSize: 10 },
          headStyles: { fillColor: [240, 173, 78] }
        });
        
        // Get the final position after table
        // @ts-ignore
        yPos = pdf.lastAutoTable.finalY + 10;
      } else {
        pdf.setFont("helvetica", "normal");
        pdf.text("Nenhum ingrediente adicionado.", 20, yPos);
        yPos += 10;
      }
      
      // For complete version, add instructions
      if (type === "complete" && recipe.instructions) {
        // Check if we need a new page
        if (yPos > pdf.internal.pageSize.height - 60) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Modo de Preparo", 20, yPos);
        yPos += 8;
        
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        
        const instructionsLines = pdf.splitTextToSize(recipe.instructions, pageWidth - 40);
        pdf.text(instructionsLines, 20, yPos);
        
        yPos += instructionsLines.length * 5 + 10;
      }
      
      // For costs version, add summary
      if (type === "costs") {
        // Check if we need a new page
        if (yPos > pdf.internal.pageSize.height - 60) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Resumo de Custos", 20, yPos);
        yPos += 10;
        
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        
        pdf.text(`Custo Total: R$ ${(recipe.cost_per_kg * recipe.yield_kg).toFixed(2)}`, 20, yPos);
        yPos += 8;
        
        pdf.text(`Custo por kg: R$ ${recipe.cost_per_kg?.toFixed(2) || "0.00"}`, 20, yPos);
        yPos += 8;
        
        if (recipe.yield_units && recipe.cost_per_unit) {
          pdf.text(`Custo por unidade: R$ ${recipe.cost_per_unit.toFixed(2)}`, 20, yPos);
        }
      }
    }
    
    // Add footer
    const today = new Date().toLocaleDateString("pt-BR");
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "italic");
    pdf.text(`Gerado em ${today} - Bread Byte Bakehouse`, pageWidth / 2, pdf.internal.pageSize.height - 10, { align: "center" });
    
    // Save the PDF
    pdf.save(`Receita - ${recipe.name} - ${type}.pdf`);
    
  } catch (error) {
    console.error("Error generating recipe PDF:", error);
    throw new Error("Failed to generate recipe PDF");
  }
}
