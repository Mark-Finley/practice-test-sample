-- CreateTable
CREATE TABLE "exam_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "bank_id" UUID NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "passing_score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_template_category_weights" (
    "template_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "question_count" INTEGER NOT NULL,

    CONSTRAINT "exam_template_category_weights_pkey" PRIMARY KEY ("template_id","category_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_templates_name_key" ON "exam_templates"("name");

-- AddForeignKey
ALTER TABLE "exam_templates" ADD CONSTRAINT "exam_templates_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "question_banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_template_category_weights" ADD CONSTRAINT "exam_template_category_weights_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "exam_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_template_category_weights" ADD CONSTRAINT "exam_template_category_weights_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "question_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
