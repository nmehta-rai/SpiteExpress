import { GraphQLClient } from 'graphql-request';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export const gqlClient = new GraphQLClient(`${SUPABASE_URL}/graphql/v1`, {
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  },
});

export type OrderStatus = 'Cancelled' | 'Delivered' | 'Pending' | 'Processing' | 'Shipped';
export type ProductCategory = 'Apparel' | 'Beauty' | 'Books' | 'Electronics' | 'Home & Garden' | 'Sports' | 'Toys';
export type PaymentMethod = 'Apple Pay' | 'Credit Card' | 'Debit Card' | 'Google Pay' | 'PayPal';

export type Order = {
  transaction_id: string;
  customer_id: string;
  order_date: string;
  delivery_date: string | null;
  customer_name: string;
  email: string;
  shipping_address: string;
  product_category: ProductCategory;
  sku: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: PaymentMethod;
  discount_applied: boolean;
  order_status: OrderStatus;
};

export type OrdersQueryResult = {
  ordersCollection: {
    totalCount: number;
    edges: Array<{ node: Order }>;
  };
};

export type SortDirection = 'AscNullsLast' | 'DescNullsLast';

export type OrdersQueryVars = {
  first: number;
  offset: number;
  orderBy?: Record<string, SortDirection>;
  filter?: Record<string, unknown>;
};

export const ORDERS_QUERY = /* GraphQL */ `
  query Orders(
    $first: Int!
    $offset: Int!
    $orderBy: [ordersOrderBy!]
    $filter: ordersFilter
  ) {
    ordersCollection(
      first: $first
      offset: $offset
      orderBy: $orderBy
      filter: $filter
    ) {
      totalCount
      edges {
        node {
          transaction_id
          customer_id
          order_date
          delivery_date
          customer_name
          email
          product_category
          sku
          quantity
          unit_price
          total_amount
          payment_method
          discount_applied
          order_status
        }
      }
    }
  }
`;

export const UPDATE_ORDER_MUTATION = /* GraphQL */ `
  mutation UpdateOrder($id: UUID!, $set: ordersUpdateInput!) {
    updateOrdersCollection(
      filter: { transaction_id: { eq: $id } }
      set: $set
    ) {
      records {
        transaction_id
        order_status
        quantity
        unit_price
        total_amount
      }
    }
  }
`;
