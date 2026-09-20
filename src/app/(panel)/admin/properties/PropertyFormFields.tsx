"use client"

import { Form, Input, Row, Select, Switch } from "antd"

const { TextArea } = Input

export const cohortOptions = [
  { value: 1, label: "1 · Reset" },
  { value: 2, label: "2 · Performance" },
  { value: 3, label: "3 · Mind" },
  { value: 4, label: "4 · Immersion" },
]

export type PropertyFormValues = {
  name: string
  slug: string
  parent_id?: string | null
  island?: string
  country?: string
  cohort_tags?: number[]
  certified?: boolean
  active?: boolean
  contact_wa?: string
  description?: string
}

// Shared between the quick-edit modal in the properties table and the Overview
// tab of the property detail page, so the two cannot drift apart.
export default function PropertyFormFields({
  parentOptions,
  excludeParentId,
}: {
  parentOptions: Array<{ id: string; name: string }>
  excludeParentId?: string
}) {
  return (
    <>
      <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name required" }]}>
        <Input autoComplete="off" placeholder="Tanya Samui — Core" />
      </Form.Item>
      <Form.Item
        name="slug"
        label="Slug"
        rules={[
          { required: true, message: "Slug required" },
          { pattern: /^[a-z0-9-]+$/, message: "Lowercase letters, digits, hyphens" },
        ]}
      >
        <Input autoComplete="off" placeholder="tanya-core" />
      </Form.Item>
      <Form.Item name="parent_id" label="Parent property (optional)">
        <Select
          allowClear
          placeholder="No parent (top-level)"
          options={parentOptions
            .filter((p) => p.id !== excludeParentId)
            .map((p) => ({ value: p.id, label: p.name }))}
        />
      </Form.Item>
      <Row gutter={12}>
        <Form.Item name="island" label="Island" style={{ flex: 1, marginRight: 12 }}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item name="country" label="Country" style={{ flex: 1 }}>
          <Input autoComplete="off" />
        </Form.Item>
      </Row>
      <Form.Item name="cohort_tags" label="Cohort focus">
        <Select mode="multiple" options={cohortOptions} placeholder="Pick cohorts" />
      </Form.Item>
      <Row gutter={12}>
        <Form.Item name="certified" label="Verified Partner" valuePropName="checked" style={{ marginRight: 24 }}>
          <Switch />
        </Form.Item>
        <Form.Item name="active" label="Active" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Row>
      <Form.Item name="contact_wa" label="WhatsApp number (with country code)">
        <Input autoComplete="off" placeholder="+66800000000" />
      </Form.Item>
      <Form.Item name="description" label="Description">
        <TextArea rows={3} />
      </Form.Item>
    </>
  )
}
